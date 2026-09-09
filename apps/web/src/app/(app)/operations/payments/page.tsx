import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { billingService } from '@/features/payments';
import { Badge } from '@/components/ui/badge';
import styles from './payments-admin.module.css';

export default async function AdminPaymentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const paymentRecords = await billingService.registration.listPaymentRecords(100);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Registration Payments Ledger</h1>
          <p className={styles.subtitle}>
            Audit log of all clinic registration gateway transactions and Premier PayFast verification statuses.
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Clinic Registration</th>
                <th>Amount</th>
                <th>Provider</th>
                <th>Transaction Reference</th>
                <th>Payment State</th>
                <th>Verification State</th>
                <th>Created Date</th>
                <th>Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {paymentRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.emptyState}>
                    No gateway registration payments recorded yet.
                  </td>
                </tr>
              ) : (
                paymentRecords.map((record) => {
                  const customerName = record.user
                    ? `${record.user.firstName} ${record.user.lastName}`
                    : 'Unknown';
                  const customerEmail = record.user?.email || '';
                  const clinicName = record.registrationIntent?.clinicName || 'Pending Organization';

                  const getStatusBadgeVariant = (status: string) => {
                    switch (status) {
                      case 'paid':
                        return 'success';
                      case 'processing':
                      case 'pending':
                        return 'warning';
                      case 'failed':
                      case 'cancelled':
                        return 'danger';
                      default:
                        return 'neutral';
                    }
                  };

                  const getVerificationBadgeVariant = (vStatus: string) => {
                    switch (vStatus) {
                      case 'verified':
                        return 'success';
                      case 'failed':
                        return 'danger';
                      default:
                        return 'neutral';
                    }
                  };

                  return (
                    <tr key={record.id}>
                      <td>
                        <strong>{customerName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{customerEmail}</div>
                      </td>
                      <td>
                        <strong>{clinicName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Plan: {record.registrationIntent?.plan || 'starter'}
                        </div>
                      </td>
                      <td className={styles.amountCol}>
                        {record.currency} {Number(record.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>
                          {record.provider === 'payfast' ? 'Premier PayFast' : record.provider}
                        </span>
                      </td>
                      <td>
                        <span className={styles.refCode}>
                          {record.providerReference || record.id.substring(0, 8)}
                        </span>
                        {record.providerTransactionId && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            Txn: {record.providerTransactionId}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge variant={getStatusBadgeVariant(record.status)} size="sm">
                          {record.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={getVerificationBadgeVariant(record.verificationStatus)} size="sm">
                          {record.verificationStatus.toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(record.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {record.paidAt ? (
                          new Date(record.paidAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
