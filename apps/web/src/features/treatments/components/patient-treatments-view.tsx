'use client';

import React, { useState } from 'react';
import { Button, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { TreatmentPlanCard } from './treatment-plan-card';
import { CreateTreatmentPlanDialog } from './create-treatment-plan-dialog';
import { CreateInvoiceDialog } from '@/features/billing/components/create-invoice-dialog';

interface PatientTreatmentsViewProps {
  organizationId: string;
  patientId: string;
  patientName: string;
  patientNumber: string;
  plans: any[];
  procedures: any[];
  catalog: any[];
  dentists: any[];
  locations: any[];
}

export function PatientTreatmentsView({
  organizationId,
  patientId,
  patientName,
  patientNumber,
  plans,
  procedures,
  catalog,
  dentists,
  locations,
}: PatientTreatmentsViewProps) {
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceInitialItems, setInvoiceInitialItems] = useState<any[]>([]);

  const handleGenerateInvoiceFromPlan = (plan: any) => {
    // Collect accepted or completed items
    const billableItems = plan.items
      ?.filter((i: any) => i.status === 'accepted' || i.status === 'completed')
      ?.map((i: any) => ({
        description: `Tooth ${i.toothCode || 'General'}: ${i.treatmentDefinition?.name || 'Procedure'}`,
        unitPrice: parseFloat(i.price || '0'),
        treatmentPlanItemId: i.id,
      }));

    if (billableItems && billableItems.length > 0) {
      setInvoiceInitialItems(billableItems);
    } else {
      setInvoiceInitialItems(
        plan.items?.map((i: any) => ({
          description: `Tooth ${i.toothCode || 'General'}: ${i.treatmentDefinition?.name || 'Procedure'}`,
          unitPrice: parseFloat(i.price || '0'),
          treatmentPlanItemId: i.id,
        })) || []
      );
    }
    setInvoiceDialogOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header / Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            Treatment Plans & Quotations
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            Active comprehensive clinical proposals, financial estimates, and patient decisions
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreatePlanOpen(true)}>
          + New Treatment Plan
        </Button>
      </div>

      {/* Treatment Plans List */}
      <div>
        {plans.length === 0 ? (
          <div
            style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              color: '#64748b',
            }}
          >
            No treatment plans recorded for this patient. Click "+ New Treatment Plan" to build one.
          </div>
        ) : (
          plans.map((plan) => (
            <TreatmentPlanCard
              key={plan.id}
              plan={plan}
              organizationId={organizationId}
              onRefresh={() => window.location.reload()}
              onGenerateInvoice={handleGenerateInvoiceFromPlan}
            />
          ))
        )}
      </div>

      {/* Completed Procedures History (Section 11) */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
          Completed Clinical Procedures ({procedures.length})
        </h3>
        {procedures.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            No executed procedures recorded yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b' }}>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Tooth</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Procedure</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Dentist</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((proc) => (
                  <tr key={proc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>
                      {new Date(proc.performedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      {proc.toothCode ? `T${proc.toothCode}` : 'General'}
                      {proc.surface ? ` (${proc.surface})` : ''}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>
                      {proc.treatmentDefinition?.name || 'Procedure'}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>
                      {proc.dentist?.displayName || 'Dentist'}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>
                      {proc.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createPlanOpen && (
        <CreateTreatmentPlanDialog
          open={createPlanOpen}
          onClose={() => {
            setCreatePlanOpen(false);
            window.location.reload();
          }}
          organizationId={organizationId}
          patientId={patientId}
          dentists={dentists}
          locations={locations}
          catalog={catalog}
          onCreated={() => window.location.reload()}
        />
      )}

      {invoiceDialogOpen && (
        <CreateInvoiceDialog
          open={invoiceDialogOpen}
          onClose={() => {
            setInvoiceDialogOpen(false);
            window.location.reload();
          }}
          organizationId={organizationId}
          patients={[{ id: patientId, name: patientName, patientNumber }]}
          locations={locations}
          initialPatientId={patientId}
          initialItems={invoiceInitialItems}
          onCreated={() => window.location.reload()}
        />
      )}
    </div>
  );
}
