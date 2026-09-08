import { describe, it, expect } from 'vitest';
import {
  ADULT_TEETH,
  getToothByFdi,
  getToothByUniversal,
  fdiToUniversal,
  universalToFdi,
  getArchLayout,
  TOOTH_CONDITIONS_CATALOG,
} from '@/features/clinical/domain/teeth';

describe('Teeth Anatomy & Numbering Domain', () => {
  it('contains exactly 32 adult permanent teeth', () => {
    expect(ADULT_TEETH).toHaveLength(32);
  });

  it('correctly maps FDI to Universal for key landmark teeth', () => {
    // Upper Right Third Molar (Wisdom)
    expect(fdiToUniversal('18')).toBe('1');
    // Upper Right Central Incisor
    expect(fdiToUniversal('11')).toBe('8');
    // Upper Left Central Incisor
    expect(fdiToUniversal('21')).toBe('9');
    // Upper Left Third Molar
    expect(fdiToUniversal('28')).toBe('16');
    // Lower Left Third Molar
    expect(fdiToUniversal('38')).toBe('17');
    // Lower Left Central Incisor
    expect(fdiToUniversal('31')).toBe('24');
    // Lower Right Central Incisor
    expect(fdiToUniversal('41')).toBe('25');
    // Lower Right Third Molar
    expect(fdiToUniversal('48')).toBe('32');
  });

  it('correctly maps Universal to FDI for key landmark teeth', () => {
    expect(universalToFdi('1')).toBe('18');
    expect(universalToFdi('8')).toBe('11');
    expect(universalToFdi('9')).toBe('21');
    expect(universalToFdi('16')).toBe('28');
    expect(universalToFdi('17')).toBe('38');
    expect(universalToFdi('24')).toBe('31');
    expect(universalToFdi('25')).toBe('41');
    expect(universalToFdi('32')).toBe('48');
  });

  it('correctly retrieves tooth definition by FDI', () => {
    const tooth = getToothByFdi('16');
    expect(tooth).toBeDefined();
    expect(tooth?.name).toBe('Upper Right First Molar');
    expect(tooth?.arch).toBe('maxillary');
    expect(tooth?.quadrant).toBe(1);
    expect(tooth?.type).toBe('molar');
    expect(tooth?.surfaces).toEqual(['M', 'D', 'O', 'B', 'L']);
  });

  it('assigns incisal (I) and facial (F) surfaces to anterior teeth', () => {
    const centralIncisor = getToothByFdi('11');
    expect(centralIncisor?.surfaces).toContain('I');
    expect(centralIncisor?.surfaces).toContain('F');
    expect(centralIncisor?.surfaces).not.toContain('O');
  });

  it('splits arches into 16 upper and 16 lower teeth', () => {
    const { upperArch, lowerArch } = getArchLayout();
    expect(upperArch).toHaveLength(16);
    expect(lowerArch).toHaveLength(16);
    expect(upperArch.every((t) => t.arch === 'maxillary')).toBe(true);
    expect(lowerArch.every((t) => t.arch === 'mandibular')).toBe(true);
  });

  it('provides accessible clinical color metadata for all defined condition types', () => {
    const requiredConditions = [
      'healthy',
      'caries',
      'filling',
      'crown',
      'root_canal',
      'missing',
      'implant',
      'fracture',
      'watch',
      'extraction_recommended',
    ];

    for (const code of requiredConditions) {
      const meta = TOOTH_CONDITIONS_CATALOG[code];
      expect(meta).toBeDefined();
      expect(meta?.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(meta?.label.length).toBeGreaterThan(0);
    }
  });
});
