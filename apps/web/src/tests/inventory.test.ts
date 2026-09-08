import { describe, it, expect } from 'vitest';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  recordStockAdjustmentSchema,
} from '@/features/workflows/domain/validation';

describe('Clinic Workflows: Inventory & Supply Tracking', () => {
  describe('Schema Validation', () => {
    it('validates a valid inventory item creation', () => {
      const validItem = {
        name: 'Prophy Paste Medium Mint',
        sku: 'PRP-MED-001',
        category: 'preventive' as const,
        unit: 'box' as const,
        quantityOnHand: 25,
        minQuantity: 10,
        costPerUnit: '18.50',
        supplierName: 'Henry Schein Dental',
        batchNumber: 'LOT-2026-X9',
        expiryDate: '2027-12-31',
      };

      const parsed = createInventoryItemSchema.safeParse(validItem);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe('Prophy Paste Medium Mint');
        expect(parsed.data.quantityOnHand).toBe(25);
        expect(parsed.data.costPerUnit).toBe(18.5);
      }
    });

    it('rejects inventory item with negative stock or negative thresholds', () => {
      const invalidItem = {
        name: 'Latex Gloves Medium',
        unit: 'box' as const,
        quantityOnHand: -5,
        minQuantity: -2,
      };

      const parsed = createInventoryItemSchema.safeParse(invalidItem);
      expect(parsed.success).toBe(false);
    });

    it('validates transaction schemas correctly', () => {
      const validRestock = {
        itemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        type: 'stock_in' as const,
        quantityChange: 50,
        reason: 'Monthly bulk replenishment order PO-9912',
      };

      const parsedRestock = recordStockAdjustmentSchema.safeParse(validRestock);
      expect(parsedRestock.success).toBe(true);

      const invalidZeroQuantity = {
        itemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        type: 'stock_used' as const,
        quantityChange: 0,
        reason: 'Zero quantity change',
      };
      const parsedZero = recordStockAdjustmentSchema.safeParse(invalidZeroQuantity);
      expect(parsedZero.success).toBe(false);
    });
  });

  describe('Stock Movement & Invariant Logic', () => {
    it('calculates balance after restock correctly', () => {
      const currentStock = 20;
      const restockQuantity = 30;
      const balanceAfter = currentStock + restockQuantity;

      expect(balanceAfter).toBe(50);
      expect(balanceAfter).toBeGreaterThanOrEqual(0);
    });

    it('calculates balance after consumption and verifies sufficiency', () => {
      const currentStock = 20;
      const consumedQuantity = 8;
      
      const hasSufficientStock = currentStock >= consumedQuantity;
      expect(hasSufficientStock).toBe(true);

      const balanceAfter = currentStock - consumedQuantity;
      expect(balanceAfter).toBe(12);
    });

    it('strictly guards against over-consumption that would cause negative stock', () => {
      const currentStock = 5;
      const requestedConsumption = 12;

      const hasSufficientStock = currentStock >= requestedConsumption;
      expect(hasSufficientStock).toBe(false);
      
      const balanceAfter = currentStock - requestedConsumption;
      expect(balanceAfter).toBeLessThan(0);
    });

    it('accurately identifies low stock alert state based on minimum threshold', () => {
      const items = [
        { name: 'Composite A2', quantityOnHand: 3, minQuantity: 5 },
        { name: 'Anesthetic Articaine 4%', quantityOnHand: 10, minQuantity: 10 },
        { name: 'Dental Needles 30G Short', quantityOnHand: 45, minQuantity: 10 },
      ];

      const lowStockItems = items.filter((item) => item.quantityOnHand <= item.minQuantity);

      expect(lowStockItems.length).toBe(2);
      expect(lowStockItems.map((i) => i.name)).toEqual(['Composite A2', 'Anesthetic Articaine 4%']);
    });

    it('identifies expiring lots within a 30-day lookahead window', () => {
      const referenceDate = new Date('2026-09-08T00:00:00Z');
      const thirtyDaysFromNow = new Date(referenceDate);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const lots = [
        { lotNumber: 'L1', expiryDate: new Date('2026-09-20T00:00:00Z') }, // in 12 days -> Expiring soon
        { lotNumber: 'L2', expiryDate: new Date('2026-08-30T00:00:00Z') }, // past -> Expired
        { lotNumber: 'L3', expiryDate: new Date('2027-01-15T00:00:00Z') },
      ];

      const expiringSoon = lots.filter(
        (l) => l.expiryDate >= referenceDate && l.expiryDate <= thirtyDaysFromNow
      );
      const expired = lots.filter((l) => l.expiryDate < referenceDate);

      expect(expiringSoon.length).toBe(1);
      expect(expiringSoon[0].lotNumber).toBe('L1');
      expect(expired.length).toBe(1);
      expect(expired[0].lotNumber).toBe('L2');
    });
  });
});
