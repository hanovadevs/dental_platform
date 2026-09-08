import { describe, it, expect } from 'vitest';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLES } from '@dental/db';
import type { PermissionCode } from '@dental/db';

/**
 * Permission matrix tests.
 * Per spec (09_TESTING_AND_QA.md Section 6):
 * "For each role, verify allowed and denied actions."
 *
 * This tests the default permission configuration, not runtime enforcement.
 * Runtime enforcement is tested in integration tests.
 */
describe('Permission Matrix', () => {
  const allPermCodes = DEFAULT_PERMISSIONS.map((p) => p.code);

  describe('Owner role', () => {
    const ownerPerms = DEFAULT_ROLES['Owner']!;

    it('has all permissions', () => {
      expect(ownerPerms.permissions.length).toBe(allPermCodes.length);
      for (const code of allPermCodes) {
        expect(ownerPerms.permissions).toContain(code);
      }
    });
  });

  describe('Dentist role', () => {
    const dentistPerms = new Set(DEFAULT_ROLES['Dentist']!.permissions);

    it('can read and write clinical records', () => {
      expect(dentistPerms.has('clinical.read')).toBe(true);
      expect(dentistPerms.has('clinical.write')).toBe(true);
    });

    it('can read and write patients', () => {
      expect(dentistPerms.has('patient.read')).toBe(true);
      expect(dentistPerms.has('patient.write')).toBe(true);
    });

    it('cannot manage staff', () => {
      expect(dentistPerms.has('staff.manage')).toBe(false);
    });

    it('cannot manage settings', () => {
      expect(dentistPerms.has('settings.manage')).toBe(false);
    });

    it('cannot process refunds', () => {
      expect(dentistPerms.has('billing.refund')).toBe(false);
    });
  });

  describe('Receptionist role', () => {
    const receptionPerms = new Set(DEFAULT_ROLES['Receptionist']!.permissions);

    it('can create appointments', () => {
      expect(receptionPerms.has('appointment.read')).toBe(true);
      expect(receptionPerms.has('appointment.write')).toBe(true);
    });

    it('can manage billing', () => {
      expect(receptionPerms.has('billing.read')).toBe(true);
      expect(receptionPerms.has('billing.write')).toBe(true);
    });

    it('cannot edit clinical records', () => {
      expect(receptionPerms.has('clinical.write')).toBe(false);
    });

    it('cannot manage staff', () => {
      expect(receptionPerms.has('staff.manage')).toBe(false);
    });

    it('cannot view audit logs', () => {
      expect(receptionPerms.has('audit.read')).toBe(false);
    });
  });

  describe('Assistant role', () => {
    const assistantPerms = new Set(DEFAULT_ROLES['Assistant']!.permissions);

    it('has read-only access to patients', () => {
      expect(assistantPerms.has('patient.read')).toBe(true);
      expect(assistantPerms.has('patient.write')).toBe(false);
    });

    it('has read-only clinical access', () => {
      expect(assistantPerms.has('clinical.read')).toBe(true);
      expect(assistantPerms.has('clinical.write')).toBe(false);
    });

    it('cannot manage billing', () => {
      expect(assistantPerms.has('billing.read')).toBe(false);
      expect(assistantPerms.has('billing.write')).toBe(false);
    });

    it('can view inventory', () => {
      expect(assistantPerms.has('inventory.read')).toBe(true);
    });
  });

  describe('Finance role', () => {
    const financePerms = new Set(DEFAULT_ROLES['Finance']!.permissions);

    it('has full billing access including refunds', () => {
      expect(financePerms.has('billing.read')).toBe(true);
      expect(financePerms.has('billing.write')).toBe(true);
      expect(financePerms.has('billing.refund')).toBe(true);
    });

    it('can view reports and export', () => {
      expect(financePerms.has('reports.read')).toBe(true);
      expect(financePerms.has('reports.export')).toBe(true);
    });

    it('cannot edit clinical records', () => {
      expect(financePerms.has('clinical.read')).toBe(false);
      expect(financePerms.has('clinical.write')).toBe(false);
    });

    it('cannot manage staff or settings', () => {
      expect(financePerms.has('staff.manage')).toBe(false);
      expect(financePerms.has('settings.manage')).toBe(false);
    });
  });

  describe('All permissions have valid module references', () => {
    const validModules = [
      'patients', 'clinical', 'appointments', 'treatments',
      'billing', 'reports', 'revenue', 'staff', 'settings',
      'audit', 'inventory', 'documents', 'communications',
    ];

    it('every permission belongs to a valid module', () => {
      for (const perm of DEFAULT_PERMISSIONS) {
        expect(validModules).toContain(perm.module);
      }
    });
  });

  describe('All role permissions reference valid permission codes', () => {
    it('every role permission is a defined permission code', () => {
      for (const [roleName, roleDef] of Object.entries(DEFAULT_ROLES)) {
        for (const permCode of roleDef.permissions) {
          const exists = allPermCodes.includes(permCode);
          expect(exists, `Role ${roleName} references undefined permission: ${permCode}`).toBe(true);
        }
      }
    });
  });
});
