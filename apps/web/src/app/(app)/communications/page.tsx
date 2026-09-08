import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@dental/db';
import { memberships, patients } from '@dental/db';
import { eq, desc } from 'drizzle-orm';
import {
  ensureDefaultTemplates,
  getCommunicationLogs,
  getTemplates,
  getCommunicationRules,
} from '@/features/communications/server/actions';
import { CommunicationsClientView } from './communications-client-view';

export const metadata = {
  title: 'Communications & Automation | Dental OS',
  description: 'Manage automated patient messaging, reminders, templates, and touchpoint history.',
};

export default async function CommunicationsPage() {
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

  // Ensure default templates exist
  await ensureDefaultTemplates(organizationId);

  // Fetch initial logs, templates, rules
  const logsRes = await getCommunicationLogs(organizationId);
  const templatesRes = await getTemplates(organizationId);
  const rulesRes = await getCommunicationRules(organizationId);

  // Fetch patient dropdown list
  const rawPatients = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      phone: patients.phone,
      email: patients.email,
    })
    .from(patients)
    .where(eq(patients.organizationId, organizationId))
    .orderBy(desc(patients.createdAt));

  const patientsList = rawPatients.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    phone: p.phone,
    email: p.email,
  }));

  return (
    <CommunicationsClientView
      organizationId={organizationId}
      initialLogs={logsRes.data || []}
      initialTemplates={templatesRes.data || []}
      initialRules={rulesRes.data || []}
      patientsList={patientsList}
    />
  );
}
