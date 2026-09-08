'use server';

import { db } from '@dental/db';
import { inventoryItems, inventoryTransactions } from '@dental/db';
import { eq, and, desc, asc, lte } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { formatErrorForClient } from '@/lib/errors';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  recordStockAdjustmentSchema,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  RecordStockAdjustmentInput,
} from '../domain/validation';
import { revalidatePath } from 'next/cache';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Fetch all inventory items for an organization, with optional low-stock filter.
 */
export async function getInventoryItems(
  organizationId: string,
  filter?: { category?: string; lowStockOnly?: boolean; locationId?: string }
): Promise<
  ActionResult<{
    items: any[];
    metrics: {
      totalItems: number;
      lowStockCount: number;
      expiringCount: number;
      totalValuation: number;
    };
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'inventory.read');

    const whereConditions = [
      eq(inventoryItems.organizationId, organizationId),
      eq(inventoryItems.active, true),
    ];

    if (filter?.category && filter.category !== 'all') {
      whereConditions.push(eq(inventoryItems.category, filter.category));
    }

    if (filter?.locationId) {
      whereConditions.push(eq(inventoryItems.locationId, filter.locationId));
    }

    const items = await db.query.inventoryItems.findMany({
      where: and(...whereConditions),
      with: {
        location: true,
      },
      orderBy: [asc(inventoryItems.name)],
    });

    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let lowStockCount = 0;
    let expiringCount = 0;
    let totalValuation = 0;

    const enrichedItems = items.map((item) => {
      const isLowStock = item.quantityOnHand <= item.minQuantity;
      const isExpiring = item.expiryDate ? new Date(item.expiryDate) <= thirtyDaysAhead : false;
      const valuation = item.quantityOnHand * parseFloat(item.costPerUnit || '0');

      if (isLowStock) lowStockCount++;
      if (isExpiring) expiringCount++;
      totalValuation += valuation;

      return {
        ...item,
        isLowStock,
        isExpiring,
        valuation,
      };
    });

    const finalItems = filter?.lowStockOnly
      ? enrichedItems.filter((i) => i.isLowStock)
      : enrichedItems;

    return {
      success: true,
      data: {
        items: finalItems,
        metrics: {
          totalItems: items.length,
          lowStockCount,
          expiringCount,
          totalValuation,
        },
      },
    };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Register a new inventory item SKU.
 */
export async function createInventoryItem(
  organizationId: string,
  rawInput: CreateInventoryItemInput
): Promise<ActionResult<{ itemId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'inventory.write');

    const parsed = createInventoryItemSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid inventory item data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;

    const [item] = await db
      .insert(inventoryItems)
      .values({
        organizationId,
        locationId: data.locationId || null,
        name: data.name,
        sku: data.sku || null,
        category: data.category,
        unit: data.unit,
        quantityOnHand: data.quantityOnHand,
        minQuantity: data.minQuantity,
        costPerUnit: data.costPerUnit.toFixed(2),
        supplierName: data.supplierName || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        batchNumber: data.batchNumber || null,
      })
      .returning();

    // If initial stock was provided, record initial transaction
    if (data.quantityOnHand > 0) {
      await db.insert(inventoryTransactions).values({
        organizationId,
        itemId: item.id,
        locationId: data.locationId || null,
        type: 'stock_in',
        quantityChange: data.quantityOnHand,
        balanceAfter: data.quantityOnHand,
        reason: 'Initial stock intake upon item creation',
        performedBy: session.user.id,
      });
    }

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'inventory_item',
      entityId: item.id,
      action: AuditActions.INVENTORY_ITEM_CREATED,
      changedFields: { name: item.name, sku: item.sku, initialQty: data.quantityOnHand },
    });

    revalidatePath('/operations');
    return { success: true, data: { itemId: item.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Update inventory item details.
 */
export async function updateInventoryItem(
  organizationId: string,
  itemId: string,
  rawInput: UpdateInventoryItemInput
): Promise<ActionResult<{ itemId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'inventory.write');

    const parsed = updateInventoryItemSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid update parameters',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;

    await db
      .update(inventoryItems)
      .set({
        name: data.name,
        sku: data.sku,
        category: data.category,
        unit: data.unit,
        minQuantity: data.minQuantity,
        costPerUnit: data.costPerUnit !== undefined ? data.costPerUnit.toFixed(2) : undefined,
        supplierName: data.supplierName,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        batchNumber: data.batchNumber,
        active: data.active,
        updatedAt: new Date(),
      })
      .where(
        and(eq(inventoryItems.id, itemId), eq(inventoryItems.organizationId, organizationId))
      );

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'inventory_item',
      entityId: itemId,
      action: AuditActions.INVENTORY_ITEM_UPDATED,
      changedFields: data as Record<string, unknown>,
    });

    revalidatePath('/operations');
    return { success: true, data: { itemId } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Record stock adjustment (stock_in, stock_used, stock_adjusted, wasted, expired).
 */
export async function recordStockAdjustment(
  organizationId: string,
  rawInput: RecordStockAdjustmentInput
): Promise<ActionResult<{ transactionId: string; newBalance: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'inventory.write');

    const parsed = recordStockAdjustmentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid adjustment data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { itemId, type, quantityChange, reason, locationId, referenceId } = parsed.data;

    // Fetch current item
    const item = await db.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.id, itemId), eq(inventoryItems.organizationId, organizationId)),
    });

    if (!item) {
      return { success: false, error: { message: 'Inventory item not found', code: 'NOT_FOUND' } };
    }

    const newBalance = item.quantityOnHand + quantityChange;
    if (newBalance < 0) {
      return {
        success: false,
        error: {
          message: `Cannot reduce stock below zero. Current stock is ${item.quantityOnHand} ${item.unit}.`,
          code: 'NEGATIVE_STOCK_DISALLOWED',
        },
      };
    }

    // Update item stock balance
    await db
      .update(inventoryItems)
      .set({
        quantityOnHand: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, itemId));

    // Record immutable audit transaction
    const [tx] = await db
      .insert(inventoryTransactions)
      .values({
        organizationId,
        itemId,
        locationId: locationId || item.locationId || null,
        type,
        quantityChange,
        balanceAfter: newBalance,
        reason,
        performedBy: session.user.id,
        referenceId: referenceId || null,
      })
      .returning();

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'inventory_item',
      entityId: itemId,
      action: AuditActions.INVENTORY_STOCK_ADJUSTED,
      changedFields: {
        type,
        quantityChange,
        newBalance,
        reason,
      },
    });

    revalidatePath('/operations');
    return { success: true, data: { transactionId: tx.id, newBalance } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Get audit transaction log for an inventory item.
 */
export async function getInventoryTransactions(
  organizationId: string,
  itemId?: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'inventory.read');

    const whereConditions = [eq(inventoryTransactions.organizationId, organizationId)];
    if (itemId) {
      whereConditions.push(eq(inventoryTransactions.itemId, itemId));
    }

    const txs = await db.query.inventoryTransactions.findMany({
      where: and(...whereConditions),
      with: {
        item: true,
        actor: true,
      },
      orderBy: [desc(inventoryTransactions.createdAt)],
      limit: 100,
    });

    return { success: true, data: txs };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
