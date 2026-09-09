'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Select, Badge, Dialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  INVENTORY_TRANSACTION_TYPES,
  LAB_WORK_TYPES,
  LAB_CASE_STATUSES,
  MEDICATION_FORMS,
  InventoryCategory,
  LabWorkType,
  LabCaseStatus,
  MedicationForm,
} from '@/features/workflows/domain/types';
import {
  createInventoryItem,
  recordStockAdjustment,
} from '@/features/workflows/server/inventory-actions';
import {
  createLabCase,
  updateLabCaseStatus,
  createLabVendor,
} from '@/features/workflows/server/lab-actions';
import {
  createMedicationTemplate,
  createConsentTemplate,
} from '@/features/workflows/server/clinical-docs-actions';
import {
  AddStaffDialog,
  AddChairDialog,
  AvailabilityDialog,
} from './operations-dialogs';
import styles from './operations.module.css';

export interface OperationsClientViewProps {
  organizationId: string;
  staffList: any[];
  chairsList: any[];
  locations: any[];
  rolesList: any[];
  inventoryData: {
    items: any[];
    metrics: {
      totalItems: number;
      lowStockCount: number;
      expiringCount: number;
      totalValuation: number;
    };
  };
  labCases: any[];
  labVendors: any[];
  patientsList: any[];
  medicationTemplates: any[];
  consentTemplates: any[];
}

export function OperationsClientView({
  organizationId,
  staffList,
  chairsList,
  locations,
  rolesList,
  inventoryData,
  labCases: initialLabCases,
  labVendors: initialLabVendors,
  patientsList,
  medicationTemplates: initialMedTemplates,
  consentTemplates: initialConsentTemplates,
}: OperationsClientViewProps) {
  const [activeTab, setActiveTab] = useState<'staff' | 'inventory' | 'lab' | 'templates'>('staff');

  // Inventory State
  const [inventoryItems, setInventoryItems] = useState<any[]>(inventoryData.items);
  const [inventoryMetrics, setInventoryMetrics] = useState(inventoryData.metrics);
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState<string>('all');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [selectedInvItem, setSelectedInvItem] = useState<any | null>(null);

  // Dental Lab State
  const [labCasesList, setLabCasesList] = useState<any[]>(initialLabCases);
  const [labVendorsList, setLabVendorsList] = useState<any[]>(initialLabVendors);
  const [labStatusFilter, setLabStatusFilter] = useState<string>('all');
  const [isAddLabCaseOpen, setIsAddLabCaseOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [reworkCaseId, setReworkCaseId] = useState<string | null>(null);
  const [reworkReason, setReworkReason] = useState('');

  // Templates State
  const [medTemplates, setMedTemplates] = useState<any[]>(initialMedTemplates);
  const [consentTpls, setConsentTpls] = useState<any[]>(initialConsentTemplates);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isAddConsentOpen, setIsAddConsentOpen] = useState(false);

  // Staff Dialogs State
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddChairOpen, setIsAddChairOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [selectedStaffForAvailability, setSelectedStaffForAvailability] = useState<any | null>(null);

  // General Form Loading & Error State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered inventory items
  const filteredInventory = inventoryItems.filter((item) => {
    if (invCategory !== 'all' && item.category !== invCategory) return false;
    if (invSearch.trim()) {
      const q = invSearch.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSku = item.sku?.toLowerCase().includes(q);
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  // Filtered lab cases
  const filteredLabCases = labCasesList.filter((c) => {
    if (labStatusFilter !== 'all' && c.status !== labStatusFilter) return false;
    return true;
  });

  // --- Inventory Form Submits ---
  const handleAddItemSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    try {
      const res = await createInventoryItem(organizationId, {
        name: fd.get('name') as string,
        sku: (fd.get('sku') as string) || null,
        category: fd.get('category') as InventoryCategory,
        unit: fd.get('unit') as any,
        quantityOnHand: parseInt(fd.get('quantityOnHand') as string) || 0,
        minQuantity: parseInt(fd.get('minQuantity') as string) || 5,
        costPerUnit: parseFloat(fd.get('costPerUnit') as string) || 0,
        supplierName: (fd.get('supplierName') as string) || null,
        expiryDate: (fd.get('expiryDate') as string) || null,
        batchNumber: (fd.get('batchNumber') as string) || null,
      });

      if (!res.success) {
        setFormError(res.error?.message || 'Failed to create inventory item');
        return;
      }

      setIsAddItemOpen(false);
      window.location.reload();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInvItem) return;
    setFormError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    try {
      const qtyChange = parseInt(fd.get('quantityChange') as string) || 0;
      const res = await recordStockAdjustment(organizationId, {
        itemId: selectedInvItem.id,
        type: fd.get('type') as any,
        quantityChange: qtyChange,
        reason: fd.get('reason') as string,
      });

      if (!res.success) {
        setFormError(res.error?.message || 'Failed to adjust stock');
        return;
      }

      setInventoryItems((prev) =>
        prev.map((item) =>
          item.id === selectedInvItem.id
            ? { ...item, quantityOnHand: res.data?.newBalance ?? item.quantityOnHand }
            : item
        )
      );

      setIsAdjustStockOpen(false);
      setSelectedInvItem(null);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Lab Case Actions ---
  const handleAddLabCaseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    try {
      const res = await createLabCase(organizationId, {
        patientId: fd.get('patientId') as string,
        labVendorId: fd.get('labVendorId') as string,
        toothNumber: (fd.get('toothNumber') as string) || null,
        workType: fd.get('workType') as LabWorkType,
        shade: (fd.get('shade') as string) || null,
        expectedDate: (fd.get('expectedDate') as string) || null,
        cost: parseFloat(fd.get('cost') as string) || 0,
        notes: (fd.get('notes') as string) || null,
      });

      if (!res.success) {
        setFormError(res.error?.message || 'Failed to create lab case');
        return;
      }

      setIsAddLabCaseOpen(false);
      window.location.reload();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLabStatus = async (caseId: string, status: LabCaseStatus, reworkNotes?: string) => {
    try {
      const res = await updateLabCaseStatus(organizationId, {
        labCaseId: caseId,
        status,
        reworkReason: reworkNotes,
      });

      if (res.success) {
        setLabCasesList((prev) =>
          prev.map((c) => (c.id === caseId ? { ...c, status } : c))
        );
        setReworkCaseId(null);
        setReworkReason('');
      }
    } catch (err) {
      console.error('Failed to update lab case status', err);
    }
  };

  const handleAddVendorSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    try {
      const res = await createLabVendor(organizationId, {
        name: fd.get('name') as string,
        contactName: (fd.get('contactName') as string) || null,
        phone: (fd.get('phone') as string) || null,
        email: (fd.get('email') as string) || null,
        address: (fd.get('address') as string) || null,
      });

      if (!res.success) {
        setFormError(res.error?.message || 'Failed to create vendor');
        return;
      }

      setIsAddVendorOpen(false);
      window.location.reload();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Clinic Operations Center</h1>
          <span className={styles.subtitle}>
            Manage clinical staff, operatory chairs, inventory stock levels, dental lab cases, and templates.
          </span>
        </div>
        <Link
          href="/operations/payments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#0284c7',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            padding: '8px 16px',
            textDecoration: 'none',
          }}
        >
          Registration Payments Ledger →
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        <button
          type="button"
          className={[styles.tabButton, activeTab === 'staff' ? styles.activeTab : ''].join(' ')}
          onClick={() => setActiveTab('staff')}
        >
          Staff & Operatory Chairs ({staffList.length})
        </button>
        <button
          type="button"
          className={[styles.tabButton, activeTab === 'inventory' ? styles.activeTab : ''].join(' ')}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory & Stock ({inventoryItems.length})
        </button>
        <button
          type="button"
          className={[styles.tabButton, activeTab === 'lab' ? styles.activeTab : ''].join(' ')}
          onClick={() => setActiveTab('lab')}
        >
          Dental Lab Tracking ({labCasesList.length})
        </button>
        <button
          type="button"
          className={[styles.tabButton, activeTab === 'templates' ? styles.activeTab : ''].join(' ')}
          onClick={() => setActiveTab('templates')}
        >
          Rx & Consent Templates ({medTemplates.length + consentTpls.length})
        </button>
      </div>

      {/* TAB 1: STAFF & CHAIRS (PHASE 1) */}
      {activeTab === 'staff' && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Practitioners & Clinical Staff</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <AvailabilityDialog
                  organizationId={organizationId}
                  staffList={staffList}
                  locations={locations}
                />
                <AddStaffDialog
                  organizationId={organizationId}
                  roles={rolesList}
                  locations={locations}
                />
              </div>
            </div>

            <div className={styles.grid}>
              {staffList.map((staff) => (
                <div key={staff.id} className={styles.card}>
                  <div>
                    <div className={styles.cardTitle}>
                      <span>{staff.displayName}</span>
                      <Badge variant={staff.active ? 'success' : 'neutral'} size="sm">
                        {staff.active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </div>
                    <div className={styles.cardSubtitle}>
                      {staff.membership?.role?.name || 'Staff'} • {staff.jobTitle || 'Team Member'}
                    </div>
                    {staff.dentistProfile && (
                      <div style={{ marginTop: '6px' }}>
                        <Badge variant="info" size="sm">
                          {staff.dentistProfile.specialty}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '8px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Working Hours: {staff.availability?.length || 0} active schedule slot(s)
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Operatory Chairs</h2>
              <AddChairDialog
                organizationId={organizationId}
                locations={locations}
              />
            </div>

            <div className={styles.grid}>
              {chairsList.map((chair) => (
                <div key={chair.id} className={styles.chairCard}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{chair.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {chair.location?.name || 'Branch Location'}
                    </div>
                  </div>
                  <Badge variant={chair.active ? 'success' : 'neutral'} size="sm">
                    {chair.active ? 'ACTIVE' : 'OFFLINE'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className={styles.section}>
          {/* Low Stock Alert */}
          {inventoryMetrics.lowStockCount > 0 && (
            <div className={styles.alertBanner}>
              <span>
                ⚠️ <strong>{inventoryMetrics.lowStockCount} inventory items</strong> have reached or fallen below minimum stock thresholds!
              </span>
            </div>
          )}

          {/* Metrics Row */}
          <div className={styles.metricsRow}>
            <div className={styles.metricBox}>
              <span className={styles.metricBoxLabel}>Total SKUs</span>
              <span className={styles.metricBoxValue}>{inventoryMetrics.totalItems}</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricBoxLabel}>Low Stock Alert</span>
              <span className={styles.metricBoxValue} style={{ color: inventoryMetrics.lowStockCount > 0 ? '#b45309' : '#16a34a' }}>
                {inventoryMetrics.lowStockCount}
              </span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricBoxLabel}>Expiring Soon (&lt;30d)</span>
              <span className={styles.metricBoxValue}>{inventoryMetrics.expiringCount}</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricBoxLabel}>Total Stock Valuation</span>
              <span className={styles.metricBoxValue}>{formatCurrency(inventoryMetrics.totalValuation)}</span>
            </div>
          </div>

          <div className={styles.sectionHeader}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search SKU or item name..."
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  minWidth: '220px',
                }}
              />
              <select
                value={invCategory}
                onChange={(e) => setInvCategory(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="all">All Categories</option>
                {INVENTORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <Button size="sm" onClick={() => setIsAddItemOpen(true)}>
              + Add Item / SKU
            </Button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item Name / SKU</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>In Stock</th>
                  <th>Min Alert</th>
                  <th>Unit Cost</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.sku && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>SKU: {item.sku}</div>}
                    </td>
                    <td>
                      <Badge variant="neutral" size="sm">
                        {item.category.toUpperCase()}
                      </Badge>
                    </td>
                    <td>{item.unit}</td>
                    <td>
                      <strong>{item.quantityOnHand}</strong>
                    </td>
                    <td style={{ color: '#64748b' }}>{item.minQuantity}</td>
                    <td>{formatCurrency(parseFloat(item.costPerUnit || '0'))}</td>
                    <td>{item.expiryDate ? formatDate(item.expiryDate) : '—'}</td>
                    <td>
                      {item.quantityOnHand <= item.minQuantity ? (
                        <Badge variant="danger" size="sm">
                          LOW STOCK
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          NORMAL
                        </Badge>
                      )}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedInvItem(item);
                          setIsAdjustStockOpen(true);
                        }}
                      >
                        Adjust Stock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DENTAL LAB TRACKING */}
      {activeTab === 'lab' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={labStatusFilter}
                onChange={(e) => setLabStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="all">All Case Statuses</option>
                {LAB_CASE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button size="sm" variant="secondary" onClick={() => setIsAddVendorOpen(true)}>
                + Lab Vendor
              </Button>
              <Button size="sm" onClick={() => setIsAddLabCaseOpen(true)}>
                + Order Lab Case
              </Button>
            </div>
          </div>

          <div className={styles.labGrid}>
            {filteredLabCases.map((c) => (
              <div key={c.id} className={styles.labCard}>
                <div className={styles.labCardHeader}>
                  <div>
                    <div className={styles.labPatient}>
                      {c.patient?.firstName} {c.patient?.lastName} ({c.patient?.patientNumber || 'Patient'})
                    </div>
                    <div className={styles.labTooth}>
                      {c.workType.replace(/_/g, ' ').toUpperCase()} {c.toothNumber ? `• Tooth #${c.toothNumber}` : ''}
                    </div>
                  </div>
                  <Badge
                    variant={
                      c.status === 'fitted'
                        ? 'success'
                        : c.status === 'rework'
                        ? 'danger'
                        : c.status === 'received'
                        ? 'info'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {c.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className={styles.labDetailsGrid}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Lab Vendor:</span> <strong>{c.vendor?.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Shade:</span> {c.shade || 'Not set'}
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Due Date:</span>{' '}
                    <strong>{c.expectedDate ? formatDate(c.expectedDate) : 'Not specified'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Lab Fee:</span> {formatCurrency(parseFloat(c.cost || '0'))}
                  </div>
                </div>

                {c.notes && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                    {c.notes}
                  </div>
                )}

                {c.reworkReason && (
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '6px', borderRadius: '4px' }}>
                    <strong>Rework reason:</strong> {c.reworkReason}
                  </div>
                )}

                <div className={styles.labActions}>
                  {c.status === 'sent' || c.status === 'in_production' ? (
                    <Button size="sm" variant="secondary" onClick={() => handleUpdateLabStatus(c.id, 'received')}>
                      Mark Received
                    </Button>
                  ) : null}

                  {c.status === 'received' ? (
                    <>
                      <Button size="sm" variant="primary" onClick={() => handleUpdateLabStatus(c.id, 'fitted')}>
                        Mark Fitted
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReworkCaseId(c.id);
                          setReworkReason('');
                        }}
                      >
                        Request Rework
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TEMPLATES */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Medication Templates */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Prescription & Medication Templates</h2>
              <Button size="sm" onClick={() => setIsAddMedOpen(true)}>
                + New Medication Formula
              </Button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Template Name</th>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Form</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {medTemplates.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.name}</strong>
                      </td>
                      <td>{m.medicationName}</td>
                      <td>{m.dosage}</td>
                      <td>
                        <Badge variant="neutral" size="sm">
                          {m.form.toUpperCase()}
                        </Badge>
                      </td>
                      <td>{m.frequency}</td>
                      <td>{m.durationDays} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consent Templates */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Practice Informed Consent Templates</h2>
              <Button size="sm" variant="secondary" onClick={() => setIsAddConsentOpen(true)}>
                + New Consent Template
              </Button>
            </div>

            <div className={styles.grid}>
              {consentTpls.map((tpl) => (
                <div key={tpl.id} className={styles.card}>
                  <div>
                    <div className={styles.cardTitle}>
                      <span>{tpl.title}</span>
                      <Badge variant="info" size="sm">
                        v{tpl.version}
                      </Badge>
                    </div>
                    <div className={styles.cardSubtitle}>Category: {tpl.category.toUpperCase()}</div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', maxHeight: '80px', overflow: 'hidden' }}>
                      {tpl.body.slice(0, 150)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Add Inventory Item Modal */}
      <Dialog
        open={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title="Add Inventory Item / Material"
      >
        <form onSubmit={handleAddItemSubmit} className={styles.formGrid}>
          {formError && <div style={{ color: 'red', fontSize: '0.8rem' }}>{formError}</div>}
          <Input label="Item Name" name="name" placeholder="e.g. Filtek Supreme Composite A2" required />
          <div className={styles.formRow2}>
            <Input label="SKU (Optional)" name="sku" placeholder="e.g. 3M-6028A2" />
            <Select
              label="Category"
              name="category"
              options={INVENTORY_CATEGORIES.map((c) => ({ value: c, label: c.toUpperCase() }))}
            />
          </div>
          <div className={styles.formRow3}>
            <Select
              label="Unit"
              name="unit"
              options={INVENTORY_UNITS.map((u) => ({ value: u, label: u.toUpperCase() }))}
            />
            <Input label="Initial Quantity" name="quantityOnHand" type="number" defaultValue="10" required />
            <Input label="Min Alert Level" name="minQuantity" type="number" defaultValue="5" required />
          </div>
          <div className={styles.formRow2}>
            <Input label="Cost per Unit ($)" name="costPerUnit" type="number" step="0.01" defaultValue="15.00" required />
            <Input label="Supplier Name" name="supplierName" placeholder="e.g. Henry Schein Dental" />
          </div>
          <div className={styles.formRow2}>
            <Input label="Expiry Date" name="expiryDate" type="date" />
            <Input label="Batch Number" name="batchNumber" placeholder="e.g. BATCH-2026-X" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => setIsAddItemOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Item'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Adjust Stock Modal */}
      <Dialog
        open={isAdjustStockOpen}
        onClose={() => setIsAdjustStockOpen(false)}
        title={`Adjust Stock: ${selectedInvItem?.name || ''}`}
      >
        <form onSubmit={handleAdjustStockSubmit} className={styles.formGrid}>
          {formError && <div style={{ color: 'red', fontSize: '0.8rem' }}>{formError}</div>}
          <div style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
            Current Balance: <strong>{selectedInvItem?.quantityOnHand} {selectedInvItem?.unit}</strong>
          </div>
          <Select
            label="Transaction Type"
            name="type"
            options={INVENTORY_TRANSACTION_TYPES.map((t) => ({
              value: t,
              label: t.replace(/_/g, ' ').toUpperCase(),
            }))}
          />
          <Input
            label="Quantity Change (+ to add, - to subtract)"
            name="quantityChange"
            type="number"
            placeholder="e.g. +10 or -2"
            required
          />
          <Input label="Reason / Notes" name="reason" placeholder="e.g. Restock shipment received from supplier" required />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => setIsAdjustStockOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm Adjustment'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Add Lab Case Modal */}
      <Dialog
        open={isAddLabCaseOpen}
        onClose={() => setIsAddLabCaseOpen(false)}
        title="Order Dental Lab Prosthetics"
      >
        <form onSubmit={handleAddLabCaseSubmit} className={styles.formGrid}>
          {formError && <div style={{ color: 'red', fontSize: '0.8rem' }}>{formError}</div>}
          <Select
            label="Patient"
            name="patientId"
            options={patientsList.map((p) => ({
              value: p.id,
              label: `${p.firstName} ${p.lastName} (${p.patientNumber || 'Patient'})`,
            }))}
          />
          <Select
            label="Dental Lab Partner"
            name="labVendorId"
            options={labVendorsList.map((v) => ({
              value: v.id,
              label: v.name,
            }))}
          />
          <div className={styles.formRow2}>
            <Select
              label="Work Type"
              name="workType"
              options={LAB_WORK_TYPES.map((w) => ({
                value: w,
                label: w.replace(/_/g, ' ').toUpperCase(),
              }))}
            />
            <Input label="Tooth Number (FDI/Universal)" name="toothNumber" placeholder="e.g. 16, 24-26" />
          </div>
          <div className={styles.formRow2}>
            <Input label="Shade Guide" name="shade" placeholder="e.g. VITA A2, Bleach 2" />
            <Input label="Expected Delivery Date" name="expectedDate" type="date" required />
          </div>
          <Input label="Laboratory Cost ($)" name="cost" type="number" step="0.01" defaultValue="120.00" />
          <Input label="Lab Instructions / Notes" name="notes" placeholder="e.g. High translucency zirconia, buccal margin porcelain" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => setIsAddLabCaseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Ordering...' : 'Order Lab Case'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Request Lab Rework Modal */}
      <Dialog
        open={!!reworkCaseId}
        onClose={() => setReworkCaseId(null)}
        title="Request Dental Lab Rework"
      >
        <div className={styles.formGrid}>
          <Input
            label="Rework Reason / Defect Description"
            value={reworkReason}
            onChange={(e) => setReworkReason(e.target.value)}
            placeholder="e.g. Tight interproximal contact, shade mismatch on buccal margin"
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => setReworkCaseId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => reworkCaseId && handleUpdateLabStatus(reworkCaseId, 'rework', reworkReason)}
            >
              Submit Rework Request
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Lab Vendor Modal */}
      <Dialog
        open={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        title="Register Dental Lab Vendor"
      >
        <form onSubmit={handleAddVendorSubmit} className={styles.formGrid}>
          {formError && <div style={{ color: 'red', fontSize: '0.8rem' }}>{formError}</div>}
          <Input label="Lab Name" name="name" placeholder="e.g. Apex Precision Dental Ceramics" required />
          <div className={styles.formRow2}>
            <Input label="Contact Person" name="contactName" placeholder="e.g. Mark Robinson" />
            <Input label="Phone" name="phone" placeholder="e.g. +1 (555) 345-6789" />
          </div>
          <Input label="Email" name="email" type="email" placeholder="lab@apexceramics.com" />
          <Input label="Address" name="address" placeholder="123 Dental Technology Blvd" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => setIsAddVendorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Vendor'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
