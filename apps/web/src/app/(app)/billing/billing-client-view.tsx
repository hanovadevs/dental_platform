'use client';

import React, { useState } from 'react';
import styles from './billing.module.css';
import { Badge, Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { CreateInvoiceDialog } from '@/features/billing/components/create-invoice-dialog';
import { RecordPaymentDialog } from '@/features/billing/components/record-payment-dialog';

interface BillingClientViewProps {
  organizationId: string;
  metrics: {
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    openInvoicesCount: number;
  };
  invoices: any[];
  patients: any[];
  locations: any[];
}

export function BillingClientView({
  organizationId,
  metrics,
  invoices,
  patients,
  locations,
}: BillingClientViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<any | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'unpaid') return inv.status === 'issued' || inv.status === 'partially_paid';
    if (statusFilter === 'paid') return inv.status === 'paid';
    return true;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partially_paid':
        return 'info';
      case 'issued':
        return 'warning';
      case 'void':
      case 'refunded':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const handleOpenPaymentForInvoice = (inv: any) => {
    setPaymentTargetInvoice(inv);
    setRecordPaymentOpen(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Billing & Revenue</h1>
          <p className={styles.subtitle}>
            Invoices, patient receivables, payment ledger, and receipts
          </p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => { setPaymentTargetInvoice(null); setRecordPaymentOpen(true); }}>
            + Record Payment
          </Button>
          <Button variant="primary" onClick={() => setCreateInvoiceOpen(true)}>
            + Create Invoice
          </Button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Billed</span>
          <span className={styles.kpiValue}>{formatCurrency(metrics.totalBilled)}</span>
          <span className={styles.kpiSub}>Lifetime invoices</span>
        </div>
        <div className={styles.kpiCard} style={{ borderLeft: '4px solid #f59e0b' }}>
          <span className={styles.kpiLabel}>Outstanding Receivables</span>
          <span className={styles.kpiValue} style={{ color: '#d97706' }}>
            {formatCurrency(metrics.totalOutstanding)}
          </span>
          <span className={styles.kpiSub}>{metrics.openInvoicesCount} open invoices</span>
        </div>
        <div className={styles.kpiCard} style={{ borderLeft: '4px solid #10b981' }}>
          <span className={styles.kpiLabel}>Total Collected</span>
          <span className={styles.kpiValue} style={{ color: '#059669' }}>
            {formatCurrency(metrics.totalCollected)}
          </span>
          <span className={styles.kpiSub}>Received payments</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterBar}>
        <div className={styles.statusTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Invoices ({invoices.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'unpaid' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('unpaid')}
          >
            Due / Unpaid ({metrics.openInvoicesCount})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'paid' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('paid')}
          >
            Paid
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Patient</th>
              <th>Status</th>
              <th>Issued Date</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Paid</th>
              <th style={{ textAlign: 'right' }}>Amount Due</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  No invoices found matching criteria.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const total = parseFloat(inv.total || '0');
                const paid = parseFloat(inv.amountPaid || '0');
                const due = parseFloat(inv.amountDue || '0');

                return (
                  <tr key={inv.id}>
                    <td>
                      <span className={styles.invNumber}>{inv.invoiceNumber}</span>
                    </td>
                    <td>
                      <Link
                        href={`/patients/${inv.patientId}?tab=billing`}
                        style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {inv.patient?.name}
                      </Link>
                    </td>
                    <td>
                      <Badge variant={getStatusBadgeVariant(inv.status)}>
                        {inv.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ color: '#64748b' }}>
                      {new Date(inv.issuedAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(total)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>
                      {formatCurrency(paid)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: due > 0 ? '#dc2626' : '#64748b' }}>
                      {formatCurrency(due)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {due > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenPaymentForInvoice(inv)}
                        >
                          Pay
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {createInvoiceOpen && (
        <CreateInvoiceDialog
          open={createInvoiceOpen}
          onClose={() => {
            setCreateInvoiceOpen(false);
            window.location.reload();
          }}
          organizationId={organizationId}
          patients={patients}
          locations={locations}
          onCreated={() => window.location.reload()}
        />
      )}

      {recordPaymentOpen && (
        <RecordPaymentDialog
          open={recordPaymentOpen}
          onClose={() => {
            setRecordPaymentOpen(false);
            setPaymentTargetInvoice(null);
            window.location.reload();
          }}
          organizationId={organizationId}
          patientId={paymentTargetInvoice ? paymentTargetInvoice.patientId : patients[0]?.id || ''}
          patientName={paymentTargetInvoice?.patient?.name}
          initialInvoiceId={paymentTargetInvoice?.id}
          invoices={
            paymentTargetInvoice
              ? [
                  {
                    id: paymentTargetInvoice.id,
                    invoiceNumber: paymentTargetInvoice.invoiceNumber,
                    total: paymentTargetInvoice.total,
                    amountDue: paymentTargetInvoice.amountDue,
                  },
                ]
              : []
          }
          onRecorded={() => window.location.reload()}
        />
      )}
    </div>
  );
}
