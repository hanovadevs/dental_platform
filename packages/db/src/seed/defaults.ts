/**
 * Default permission definitions.
 * These are system-wide; each role within an organization maps to a subset.
 * Per spec (04_SYSTEM_ARCHITECTURE.md Section 5).
 */
export const DEFAULT_PERMISSIONS = [
  // Patient
  { code: 'patient.read', name: 'View patients', module: 'patients' },
  { code: 'patient.write', name: 'Create and edit patients', module: 'patients' },
  { code: 'patient.archive', name: 'Archive patients', module: 'patients' },
  { code: 'patient.import', name: 'Import patients', module: 'patients' },

  // Clinical
  { code: 'clinical.read', name: 'View clinical records', module: 'clinical' },
  { code: 'clinical.write', name: 'Edit clinical records', module: 'clinical' },

  // Appointment
  { code: 'appointment.read', name: 'View appointments', module: 'appointments' },
  { code: 'appointment.write', name: 'Create and edit appointments', module: 'appointments' },

  // Treatment
  { code: 'treatment.read', name: 'View treatment plans', module: 'treatments' },
  { code: 'treatment.write', name: 'Create and edit treatment plans', module: 'treatments' },
  { code: 'treatment.catalog', name: 'Manage treatment catalog', module: 'treatments' },

  // Billing
  { code: 'billing.read', name: 'View invoices and payments', module: 'billing' },
  { code: 'billing.write', name: 'Create invoices and record payments', module: 'billing' },
  { code: 'billing.refund', name: 'Process refunds and reversals', module: 'billing' },

  // Reports
  { code: 'reports.read', name: 'View reports', module: 'reports' },
  { code: 'reports.export', name: 'Export data', module: 'reports' },

  // Revenue
  { code: 'revenue.read', name: 'View revenue opportunities', module: 'revenue' },
  { code: 'revenue.write', name: 'Manage revenue opportunities', module: 'revenue' },

  // Staff
  { code: 'staff.manage', name: 'Manage staff and invitations', module: 'staff' },

  // Settings
  { code: 'settings.manage', name: 'Manage clinic settings', module: 'settings' },

  // Audit
  { code: 'audit.read', name: 'View audit logs', module: 'audit' },

  // Inventory
  { code: 'inventory.read', name: 'View inventory', module: 'inventory' },
  { code: 'inventory.write', name: 'Manage inventory', module: 'inventory' },

  // Documents
  { code: 'documents.read', name: 'View documents', module: 'documents' },
  { code: 'documents.write', name: 'Upload and manage documents', module: 'documents' },

  // Communications
  { code: 'communications.read', name: 'View communications', module: 'communications' },
  { code: 'communications.write', name: 'Send communications', module: 'communications' },
] as const;

export type PermissionCode = (typeof DEFAULT_PERMISSIONS)[number]['code'];

/**
 * Default role definitions with their permission sets.
 * Per spec (09_TESTING_AND_QA.md Section 6 - Permission Matrix).
 */
export const DEFAULT_ROLES: Record<string, { description: string; permissions: PermissionCode[] }> =
  {
    Owner: {
      description: 'Full access to all clinic features',
      permissions: DEFAULT_PERMISSIONS.map((p) => p.code),
    },
    Dentist: {
      description: 'Clinical access with limited administrative features',
      permissions: [
        'patient.read',
        'patient.write',
        'clinical.read',
        'clinical.write',
        'appointment.read',
        'appointment.write',
        'treatment.read',
        'treatment.write',
        'billing.read',
        'reports.read',
        'revenue.read',
        'documents.read',
        'documents.write',
        'communications.read',
      ],
    },
    Receptionist: {
      description: 'Front-desk operations and patient-facing workflows',
      permissions: [
        'patient.read',
        'patient.write',
        'patient.import',
        'appointment.read',
        'appointment.write',
        'treatment.read',
        'billing.read',
        'billing.write',
        'revenue.read',
        'revenue.write',
        'communications.read',
        'communications.write',
        'documents.read',
      ],
    },
    Assistant: {
      description: 'Clinical support with limited access',
      permissions: [
        'patient.read',
        'clinical.read',
        'appointment.read',
        'treatment.read',
        'inventory.read',
        'documents.read',
      ],
    },
    Finance: {
      description: 'Financial reporting and billing access',
      permissions: [
        'patient.read',
        'billing.read',
        'billing.write',
        'billing.refund',
        'reports.read',
        'reports.export',
        'revenue.read',
      ],
    },
  };
