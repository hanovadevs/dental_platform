'use client';

import React, { useState } from 'react';
import { Button, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { CreateInvoiceDialog } from './create-invoice-dialog';
import { RecordPaymentDialog } from './record-payment-dialog';

interface PatientBillingViewProps {
  organizationId: string;
  patientId: string;
  patientName: string;
  patientNumber: string;
  financialSummary: {
    totalBilled: number;
    totalPaid: number;
    outstandingBalance: number;
    invoices: any[];
    payments: any[];
  };
  locations: any[];
}

export function PatientBillingView({
  organizationId,
  patientId,
  patientName,
  patientNumber,
  financialSummary,
  locations,
}: PatientBillingViewProps) {
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [targetInvoiceId, setTargetInvoiceId] = useState<string | undefined>(undefined);

  const { totalBilled, totalPaid, outstandingBalance, invoices, payments } = financialSummary;

  const handlePayInvoice = (invoiceId: string) => {
    setTargetInvoiceId(invoiceId);
    setRecordPaymentOpen(true);
  };

  const openInvoicesForPayment = invoices
    .filter((inv) => inv.status === 'issued' || inv.status === 'partially_paid')
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      total: inv.total,
      amountDue: inv.amountDue,
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Outstanding Balance Banner if > 0 */}
      {outstandingBalance > 0 && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>
              Outstanding Balance Due: {formatCurrency(outstandingBalance)}
            </span>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#b45309' }}>
              Patient has unsettled invoices on file.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setTargetInvoiceId(undefined);
              setRecordPaymentOpen(true);
            }}
          >
            Record Payment Now
          </Button>
        </div>
      )}

      {/* Financial Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            Total Invoiced
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {formatCurrency(totalBilled)}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            Total Payments Collected
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>
            {formatCurrency(totalPaid)}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            Current Balance Due
          </span>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: outstandingBalance > 0 ? '#dc2626' : '#059669',
              marginTop: '0.25rem',
            }}
          >
            {formatCurrency(outstandingBalance)}
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Invoices ({invoices.length})
          </h3>
          <Button variant="primary" size="sm" onClick={() => setCreateInvoiceOpen(true)}>
            + Create Invoice
          </Button>
        </div>

        {invoices.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No invoices issued yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b' }}>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Invoice #</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Paid</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Due</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const total = parseFloat(inv.total || '0');
                  const paid = parseFloat(inv.amountPaid || '0');
                  const due = parseFloat(inv.amountDue || '0');

                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>
                        {new Date(inv.issuedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <Badge
                          variant={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'partially_paid'
                              ? 'info'
                              : 'warning'
                          }
                        >
                          {inv.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(total)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#059669' }}>
                        {formatCurrency(paid)}
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 0.75rem',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: due > 0 ? '#dc2626' : '#64748b',
                        }}
                      >
                        {formatCurrency(due)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                        {due > 0 && (
                          <Button variant="secondary" size="sm" onClick={() => handlePayInvoice(inv.id)}>
                            Pay
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments Ledger Section */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Payment History & Receipts ({payments.length})
          </h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTargetInvoiceId(undefined);
              setRecordPaymentOpen(true);
            }}
          >
            + Record Payment
          </Button>
        </div>

        {payments.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No payments recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b' }}>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Receipt #</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Method</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Reference</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Amount Paid</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pmt) => (
                  <tr key={pmt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>
                      {pmt.receiptNumber}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>
                      {new Date(pmt.paidAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textTransform: 'capitalize' }}>
                      {pmt.method.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>
                      {pmt.reference || '—'}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                      {formatCurrency(parseFloat(pmt.amount || '0'))}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>
                      {pmt.recorder ? `${pmt.recorder.firstName} ${pmt.recorder.lastName}` : 'Staff'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createInvoiceOpen && (
        <CreateInvoiceDialog
          open={createInvoiceOpen}
          onClose={() => {
            setCreateInvoiceOpen(false);
            window.location.reload();
          }}
          organizationId={organizationId}
          patients={[{ id: patientId, name: patientName, patientNumber }]}
          locations={locations}
          initialPatientId={patientId}
          onCreated={() => window.location.reload()}
        />
      )}

      {recordPaymentOpen && (
        <RecordPaymentDialog
          open={recordPaymentOpen}
          onClose={() => {
            setRecordPaymentOpen(false);
            setTargetInvoiceId(undefined);
            window.location.reload();
          }}
          organizationId={organizationId}
          patientId={patientId}
          patientName={patientName}
          initialInvoiceId={targetInvoiceId}
          invoices={openInvoicesForPayment}
          onRecorded={() => window.location.reload()}
        />
      )}
    </div>
  );
}
