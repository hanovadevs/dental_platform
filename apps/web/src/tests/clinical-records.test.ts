import { describe, it, expect } from 'vitest';
import {
  recordToothConditionSchema,
  createClinicalNoteSchema,
} from '@/features/clinical/domain/validation';

describe('Clinical Records Validation & Domain Rules', () => {
  const validUuid = '11111111-1111-1111-1111-111111111111';

  describe('recordToothConditionSchema', () => {
    it('validates a surface-level caries condition', () => {
      const input = {
        toothCode: '16',
        surface: 'MOD',
        conditionType: 'caries' as const,
        status: 'diagnosed' as const,
        notes: 'Deep cavity on occlusal extending to mesial',
      };

      const result = recordToothConditionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.toothCode).toBe('16');
        expect(result.data.surface).toBe('MOD');
        expect(result.data.conditionType).toBe('caries');
        expect(result.data.status).toBe('diagnosed');
      }
    });

    it('validates whole tooth condition (no surface)', () => {
      const input = {
        toothCode: '21',
        conditionType: 'crown' as const,
        status: 'completed' as const,
      };

      const result = recordToothConditionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.surface).toBeUndefined();
        expect(result.data.status).toBe('completed');
      }
    });

    it('validates supersedesId when replacing previous condition', () => {
      const input = {
        toothCode: '36',
        surface: 'O',
        conditionType: 'filling' as const,
        status: 'completed' as const,
        supersedesId: validUuid,
      };

      const result = recordToothConditionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.supersedesId).toBe(validUuid);
      }
    });

    it('rejects invalid condition types', () => {
      const input = {
        toothCode: '11',
        conditionType: 'laser_whitening', // Not in catalog
        status: 'diagnosed' as const,
      };

      const result = recordToothConditionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects missing tooth code', () => {
      const input = {
        toothCode: '',
        conditionType: 'caries' as const,
        status: 'diagnosed' as const,
      };

      const result = recordToothConditionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('createClinicalNoteSchema (SOAP)', () => {
    it('validates a complete SOAP progress note', () => {
      const input = {
        dentistId: validUuid,
        chiefComplaint: 'Sharp pain in lower right molar when biting down.',
        diagnosis: 'Tooth 46 irreversible pulpitis with symptomatic apical periodontitis.',
        treatmentProvided: 'Access cavity prepared. Extirpated pulp. Canal instrumentation to size 25. Irrigated with NaOCl. Placed Ledermix dressing and Cavit seal.',
        plan: 'Obturation in 1 week. Crown preparation indicated following symptom resolution.',
      };

      const result = createClinicalNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.treatmentProvided).toContain('Access cavity');
        expect(result.data.chiefComplaint).toBeDefined();
      }
    });

    it('requires treatmentProvided description', () => {
      const input = {
        chiefComplaint: 'Routine checkup',
        diagnosis: 'No abnormalities detected',
        treatmentProvided: '', // Empty
      };

      const result = createClinicalNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('treatmentProvided');
      }
    });

    it('allows optional fields when only treatment provided is documented', () => {
      const input = {
        treatmentProvided: 'Routine scaling and prophylaxis completed without complications.',
      };

      const result = createClinicalNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
