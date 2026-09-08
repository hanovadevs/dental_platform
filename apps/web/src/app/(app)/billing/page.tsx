import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@dental/db';
import {
  memberships,
  invoices,
  patients,
  locations,
} from '@dental/db';
import { eq, desc } from 'drizzle-orm';
import { getBillingMetrics } from '@/features/billing/server/actions';
import { BillingClientView } from './billing-client-view';

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  if (!membership) {
    redirect('/onboarding');
  }

  const organizationId = membership.organizationId;

  // 1. Fetch metrics
  const metricsResult = await getBillingMetrics(organizationId);
  const metrics = metricsResult.data || {
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    openInvoicesCount: 0,
  };

  // 2. Fetch invoices with relations
  const invoiceList = await db.query.invoices.findMany({
    where: eq(invoices.organizationId, organizationId),
    with: {
      patient: true,
      location: true,
      items: true,
      payments: true,
    },
    orderBy: (invoices, { desc }) => [desc(invoices.issuedAt)],
  });

  // 3. Fetch patients and locations for dialog dropdowns
  const rawPatients = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      patientNumber: patients.patientNumber,
    })
    .from(patients)
    .where(eq(patients.organizationId, organizationId));

  const patientList = rawPatients.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    patientNumber: p.patientNumber,
  }));

  const locationList = await db
    .select({
      id: locations.id,
      name: locations.name,
    })
    .from(locations)
    .where(eq(locations.organizationId, organizationId));

  return (
    <BillingClientView
      organizationId={organizationId}
      metrics={metrics}
      invoices={invoiceList}
      patients={patientList}
      locations={locationList}
    />
  );
}
