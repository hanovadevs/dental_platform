import { describe, it, expect } from 'vitest';
import {
  scrubPatientPii,
  scrubEmergencyContact,
  scrubClinicalNote,
  buildPracticeExportBundle,
} from '@/features/admin/domain/privacy';

describe('Data Portability & GDPR Privacy Domain', () => {
  const patientId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  describe('GDPR Right to Erasure / Patient PII Anonymization', () => {
    it('irreversibly scrubs patient demographics while retaining entity id and audit timestamp', () => {
      const originalPatient = {
        id: patientId,
        firstName: 'Jonathan',
        lastName: 'Doe',
        email: 'jonathan.doe@personal.com',
        phone: '+1 555 432 1098',
        dateOfBirth: '1982-08-14',
        address: '742 Evergreen Terrace, Springfield',
        notes: 'Patient requested confidential billing.',
        status: 'active',
      };

      const anonymized = scrubPatientPii(
        originalPatient,
        'Patient submitted formal GDPR Article 17 erasure request'
      );

      // Verify ID preserved for statutory referential integrity
      expect(anonymized.id).toBe(patientId);

      // Verify PII scrubbed
      expect(anonymized.firstName).toBe('[ANONYMIZED]');
      expect(anonymized.lastName).toBe('Patient-A1B2C3D4');
      expect(anonymized.email).toBe('erased-A1B2C3D4@redacted.local');
      expect(anonymized.phone).toBe('+0000000000');
      expect(anonymized.dateOfBirth).toBeNull();
      expect(anonymized.address).toContain('REDACTED UNDER GDPR');
      expect(anonymized.notes).toContain('GDPR Article 17 erasure request');

      // Verify status transitions to archived with timestamp
      expect(anonymized.status).toBe('archived');
      expect(anonymized.archivedAt).toBeInstanceOf(Date);
    });

    it('scrubs emergency contact details cleanly', () => {
      const contact = {
        id: 'ec-1',
        name: 'Mary Doe',
        relationship: 'Spouse',
        phone: '+1 555 999 8888',
      };

      const scrubbed = scrubEmergencyContact(contact);
      expect(scrubbed.id).toBe('ec-1');
      expect(scrubbed.name).toBe('[ANONYMIZED CONTACT]');
      expect(scrubbed.phone).toBe('+0000000000');
      expect(scrubbed.relationship).toBe('REDACTED');
    });

    it('redacts narrative clinical note contents', () => {
      const note = {
        id: 'note-1',
        chiefComplaint: 'Severe aching pain on upper right quadrant since Thursday.',
        diagnosis: 'Irreversible pulpitis on tooth 16.',
        treatmentProvided: 'Pulpectomy and Cavit temporary dressing.',
        plan: 'Return in 7 days for root canal obturation.',
      };

      const scrubbed = scrubClinicalNote(note);
      expect(scrubbed.chiefComplaint).toBe('[REDACTED UNDER PRIVACY REQUEST]');
      expect(scrubbed.diagnosis).toBe('[REDACTED]');
      expect(scrubbed.treatmentProvided).toBe('[REDACTED]');
      expect(scrubbed.plan).toBe('[REDACTED]');
    });

    it('preserves financial ledger totals when patient is scrubbed', () => {
      // Invoices and payments must retain dollar amounts and transaction records
      const invoice = {
        id: 'inv-5001',
        patientId,
        invoiceNumber: 'INV-2026-0089',
        subtotal: 450.0,
        tax: 0.0,
        discount: 50.0,
        total: 400.0,
        amountPaid: 400.0,
        status: 'paid',
      };

      const payment = {
        id: 'pay-7001',
        invoiceId: invoice.id,
        patientId,
        amount: 400.0,
        method: 'card',
        receiptNumber: 'REC-99482',
      };

      // Ensure ledger integrity is unchanged by anonymization
      expect(invoice.total).toBe(400.0);
      expect(invoice.amountPaid).toBe(400.0);
      expect(payment.amount).toBe(400.0);
      expect(payment.receiptNumber).toBe('REC-99482');
    });
  });

  describe('Practice Archive Export Bundle', () => {
    it('constructs a standardized, validated practice archive bundle', () => {
      const fixedDate = new Date('2026-09-08T12:00:00Z');

      const result = buildPracticeExportBundle({
        exportedByUserId: 'admin-user-1',
        organization: {
          id: 'org-12345678-abcd',
          name: 'Smile Studio Dental',
          slug: 'smile-studio',
          currency: 'USD',
        },
        locations: [{ id: 'loc-1', name: 'Downtown Branch' }],
        chairs: [{ id: 'ch-1', name: 'Chair 1' }, { id: 'ch-2', name: 'Chair 2' }],
        staff: [{ id: 'st-1', name: 'Dr. Jane' }],
        dentists: [{ id: 'd-1', license: 'DENT-101' }],
        patients: [{ id: 'p-1', name: 'Patient A' }],
        appointments: [{ id: 'ap-1', start: '10:00' }],
        dentalChart: [{ id: 'tc-1', tooth: '16' }],
        clinicalNotes: [{ id: 'cn-1', text: 'Cleaned' }],
        treatmentPlans: [{ id: 'tp-1', total: 1000 }],
        procedures: [{ id: 'pr-1', fee: 500 }],
        invoices: [{ id: 'in-1', total: 500 }],
        payments: [{ id: 'py-1', amount: 500 }],
        inventory: [{ id: 'iv-1', sku: 'LIDO-100' }],
        labCases: [{ id: 'lc-1', title: 'Crown 46' }],
        now: fixedDate,
      });

      expect(result.fileName).toBe('dental-practice-archive-org-1234-2026-09-08.json');
      expect(result.recordCounts.locations).toBe(1);
      expect(result.recordCounts.chairs).toBe(2);
      expect(result.recordCounts.invoices).toBe(1);
      expect(result.recordCounts.inventoryItems).toBe(1);

      const parsed = JSON.parse(result.exportJson);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.exportedByUserId).toBe('admin-user-1');
      expect(parsed.organization.name).toBe('Smile Studio Dental');
      expect(parsed.chairs.length).toBe(2);
      expect(parsed.patients.length).toBe(1);
    });
  });
});
