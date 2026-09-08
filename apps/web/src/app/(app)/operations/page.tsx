import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@dental/db';
import {
  memberships,
  staffProfiles,
  chairs,
  locations,
  roles,
  patients,
} from '@dental/db';
import { eq, and } from 'drizzle-orm';
import { getInventoryItems } from '@/features/workflows/server/inventory-actions';
import { getLabCases, getLabVendors } from '@/features/workflows/server/lab-actions';
import {
  getMedicationTemplates,
  getConsentTemplates,
} from '@/features/workflows/server/clinical-docs-actions';
import { OperationsClientView } from './operations-client-view';

export const metadata = {
  title: 'Operations Center | Dental OS',
  description: 'Manage clinical staff, operatory chairs, inventory stock levels, and dental lab cases.',
};

export default async function OperationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userMembership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  if (!userMembership) {
    redirect('/onboarding');
  }

  const organizationId = userMembership.organizationId;

  // 1. Fetch staff profiles with dentist details and roles
  const staffList = await db.query.staffProfiles.findMany({
    where: eq(staffProfiles.organizationId, organizationId),
    with: {
      dentistProfile: true,
      membership: {
        with: {
          role: true,
        },
      },
      availability: {
        with: {
          location: true,
        },
      },
    },
  });

  // 2. Fetch chairs
  const chairsList = await db.query.chairs.findMany({
    where: eq(chairs.organizationId, organizationId),
    with: {
      location: true,
    },
  });

  // 3. Fetch roles and locations
  const orgRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.organizationId, organizationId));

  const orgLocations = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(and(eq(locations.organizationId, organizationId), eq(locations.active, true)));

  // 4. Fetch Inventory Items & Valuation
  const invRes = await getInventoryItems(organizationId);
  const inventoryData = invRes.data || {
    items: [],
    metrics: { totalItems: 0, lowStockCount: 0, expiringCount: 0, totalValuation: 0 },
  };

  // 5. Fetch Lab Cases & Vendors
  const labCasesRes = await getLabCases(organizationId);
  const labCases = labCasesRes.data || [];

  const labVendorsRes = await getLabVendors(organizationId);
  const labVendors = labVendorsRes.data || [];

  // 6. Fetch Patients list for quick selection
  const patientsList = await db.query.patients.findMany({
    where: and(eq(patients.organizationId, organizationId), eq(patients.status, 'active')),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      patientNumber: true,
    },
  });

  // 7. Fetch Medication & Consent Templates
  const medTplRes = await getMedicationTemplates(organizationId);
  const medTemplates = medTplRes.data || [];

  const consentTplRes = await getConsentTemplates(organizationId);
  const consentTemplates = consentTplRes.data || [];

  return (
    <OperationsClientView
      organizationId={organizationId}
      staffList={staffList}
      chairsList={chairsList}
      locations={orgLocations}
      rolesList={orgRoles}
      inventoryData={inventoryData}
      labCases={labCases}
      labVendors={labVendors}
      patientsList={patientsList}
      medicationTemplates={medTemplates}
      consentTemplates={consentTemplates}
    />
  );
}
