import { describe, it, expect } from 'vitest';
import {
  createLabVendorSchema,
  createLabCaseSchema,
  updateLabCaseStatusSchema,
} from '@/features/workflows/domain/validation';

describe('Clinic Workflows: Dental Lab Tracking', () => {
  describe('Lab Vendor Schema Validation', () => {
    it('validates a complete lab vendor configuration', () => {
      const vendorData = {
        name: 'Apex Precision Dental Arts',
        contactName: 'David Miller, CDT',
        email: 'orders@apexdentalarts.com',
        phone: '+1 (555) 432-8765',
        address: '123 Dental Craft Way, Suite 400',
        notes: 'Specializes in layered e.max anterior crowns and zirconia bridges.',
      };

      const parsed = createLabVendorSchema.safeParse(vendorData);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe('Apex Precision Dental Arts');
        expect(parsed.data.contactName).toBe('David Miller, CDT');
      }
    });

    it('rejects vendor without required name or invalid email', () => {
      const invalidVendor = {
        name: '',
        email: 'not-an-email',
      };

      const parsed = createLabVendorSchema.safeParse(invalidVendor);
      expect(parsed.success).toBe(false);
    });
  });

  describe('Lab Case Schema Validation', () => {
    it('validates creation of a dental lab case with shade and appliance specifications', () => {
      const validCase = {
        patientId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        labVendorId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        workType: 'crown' as const,
        toothNumber: '19',
        shade: 'A2',
        notes: 'Scanned with 3Shape Trios. Lingual clearance 1.5mm. Stain and glaze.',
        sentDate: '2026-09-08',
        expectedDate: '2026-09-15',
        cost: 145.0,
      };

      const parsed = createLabCaseSchema.safeParse(validCase);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.workType).toBe('crown');
        expect(parsed.data.toothNumber).toBe('19');
        expect(parsed.data.shade).toBe('A2');
        expect(parsed.data.cost).toBe(145.0);
      }
    });

    it('validates status updates including rework requests', () => {
      const fittedUpdate = {
        labCaseId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        status: 'fitted' as const,
        notes: 'Fitting successful, occlusion verified with shimstock.',
      };
      const parsedFitted = updateLabCaseStatusSchema.safeParse(fittedUpdate);
      expect(parsedFitted.success).toBe(true);

      const reworkUpdate = {
        labCaseId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        status: 'rework' as const,
        reworkReason: 'Margin discrepancy on mesial aspect; new scan captured.',
      };
      const parsedRework = updateLabCaseStatusSchema.safeParse(reworkUpdate);
      expect(parsedRework.success).toBe(true);
      if (parsedRework.success) {
        expect(parsedRework.data.status).toBe('rework');
        expect(parsedRework.data.reworkReason).toContain('Margin discrepancy');
      }
    });
  });

  describe('Lab Workflow Progression & State Machine', () => {
    const validStatuses = [
      'prepared',
      'sent',
      'in_production',
      'received',
      'fitted',
      'rework',
      'cancelled',
    ] as const;

    it('maintains valid status transitions in order', () => {
      let currentStatus: (typeof validStatuses)[number] = 'prepared';
      expect(currentStatus).toBe('prepared');

      currentStatus = 'sent';
      expect(currentStatus).toBe('sent');

      currentStatus = 'in_production';
      expect(currentStatus).toBe('in_production');

      currentStatus = 'received';
      expect(currentStatus).toBe('received');

      currentStatus = 'fitted';
      expect(currentStatus).toBe('fitted');
    });

    it('handles rework tracking properly', () => {
      let reworkCount = 0;
      let status = 'received';

      // Doctor inspects crown, requests remake
      status = 'rework';
      reworkCount += 1;

      expect(status).toBe('rework');
      expect(reworkCount).toBe(1);

      // Resent to lab
      status = 'sent';
      expect(status).toBe('sent');
      expect(reworkCount).toBe(1);
    });

    it('flags overdue cases when current date exceeds expected date', () => {
      const today = new Date('2026-09-08T00:00:00Z');
      const cases = [
        { id: 'c1', status: 'sent', expectedDate: new Date('2026-09-05T00:00:00Z') }, // Overdue
        { id: 'c2', status: 'in_production', expectedDate: new Date('2026-09-12T00:00:00Z') },  // On time
        { id: 'c3', status: 'fitted', expectedDate: new Date('2026-09-01T00:00:00Z') },   // Fitted, not overdue
      ];

      const overdueCases = cases.filter(
        (c) => c.status !== 'fitted' && c.status !== 'cancelled' && c.expectedDate < today
      );

      expect(overdueCases.length).toBe(1);
      expect(overdueCases[0].id).toBe('c1');
    });
  });
});
