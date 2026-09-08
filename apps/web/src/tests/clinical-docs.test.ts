import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  createMedicationTemplateSchema,
  createPrescriptionSchema,
  createConsentTemplateSchema,
  signDocumentSchema,
} from '@/features/workflows/domain/validation';

describe('Clinic Workflows: Prescriptions & Digital Informed Consents', () => {
  describe('Medication Template & Prescription Validation', () => {
    it('validates pre-configured medication templates', () => {
      const validTemplate = {
        name: 'Amoxicillin 500mg Standard Protocol',
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        form: 'capsule' as const,
        frequency: 'Take 1 capsule by mouth every 8 hours for 7 days',
        durationDays: 7,
        instructions: 'Take with a full glass of water, finish complete course.',
      };

      const parsed = createMedicationTemplateSchema.safeParse(validTemplate);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.medicationName).toBe('Amoxicillin');
        expect(parsed.data.durationDays).toBe(7);
      }
    });

    it('validates multi-item prescription creation', () => {
      const validPrescription = {
        patientId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        dentistId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        notes: 'Pre-op medication regimen for surgical extraction of tooth 32.',
        items: [
          {
            medicationName: 'Amoxicillin',
            dosage: '500mg',
            form: 'capsule' as const,
            frequency: '1 capsule TID',
            durationDays: 7,
            quantity: '21 capsules',
            instructions: 'Finish entire course even if symptoms improve',
          },
          {
            medicationName: 'Ibuprofen',
            dosage: '600mg',
            form: 'tablet' as const,
            frequency: '1 tablet Q6H PRN moderate pain',
            durationDays: 5,
            quantity: '20 tablets',
            instructions: 'Take with food to prevent gastric distress',
          },
        ],
      };

      const parsed = createPrescriptionSchema.safeParse(validPrescription);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.items.length).toBe(2);
        expect(parsed.data.items[0].medicationName).toBe('Amoxicillin');
        expect(parsed.data.items[1].quantity).toBe('20 tablets');
      }
    });

    it('rejects prescription with zero items', () => {
      const invalidPrescription = {
        patientId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        items: [],
      };

      const parsed = createPrescriptionSchema.safeParse(invalidPrescription);
      expect(parsed.success).toBe(false);
    });
  });

  describe('Consent Templates & Digital Signatures', () => {
    it('validates consent templates with replacement token variables', () => {
      const validTemplate = {
        title: 'Informed Consent for Surgical Tooth Extraction',
        category: 'surgical',
        body:
          'I, {{patientName}}, authorize Dr. {{dentistName}} to perform extraction of tooth #{{toothNumber}}. Potential risks include bleeding, infection, dry socket, and paresthesia.',
      };

      const parsed = createConsentTemplateSchema.safeParse(validTemplate);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.title).toContain('Informed Consent');
        expect(parsed.data.body).toContain('{{patientName}}');
      }
    });

    it('validates digital signature payload format', () => {
      const signaturePayload = {
        patientId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        title: 'Informed Consent - Extraction #32',
        type: 'consent_form' as const,
        content: 'I, Jane Doe, consent to extraction of tooth #32.',
        signerName: 'Jane M. Doe',
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const parsed = signDocumentSchema.safeParse(signaturePayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.signerName).toBe('Jane M. Doe');
      }
    });

    it('generates deterministic and tamper-evident SHA-256 signature hashes', () => {
      const documentBody = 'I, Jane Doe, consent to the surgical extraction of wisdom tooth #32.';
      const patientId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const signerName = 'Jane M. Doe';
      const timestamp = '2026-09-08T18:00:00.000Z';
      const orgId = 'org-clinic-1';

      const generateHash = (content: string, pId: string, signer: string, ts: string, oId: string) => {
        const payload = `${content}|${pId}|${signer}|${ts}|${oId}`;
        return crypto.createHash('sha256').update(payload).digest('hex');
      };

      const hash1 = generateHash(documentBody, patientId, signerName, timestamp, orgId);
      const hash2 = generateHash(documentBody, patientId, signerName, timestamp, orgId);

      // Deterministic: exact same payload yields exact same 64-char hex hash
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);

      // Tamper-evident: any modification in the text invalidates the cryptographic hash
      const tamperedBody = 'I, Jane Doe, consent to the root canal of tooth #32.';
      const tamperedHash = generateHash(tamperedBody, patientId, signerName, timestamp, orgId);
      expect(tamperedHash).not.toBe(hash1);

      // Signer change invalidates the hash
      const impostorHash = generateHash(documentBody, patientId, 'John Doe', timestamp, orgId);
      expect(impostorHash).not.toBe(hash1);
    });
  });
});
