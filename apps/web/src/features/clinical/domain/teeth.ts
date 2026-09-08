/**
 * Standard Dental Anatomy and Tooth Numbering Catalog.
 * Supports FDI Two-Digit Notation (ISO 3950) and Universal Numbering System (American).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 6, 06_UI_UX_DESIGN_SYSTEM.md Section 17).
 */

export type Arch = 'maxillary' | 'mandibular';
export type Quadrant = 1 | 2 | 3 | 4;
export type ToothType = 'incisor' | 'canine' | 'premolar' | 'molar';
export type ToothSurface = 'M' | 'D' | 'O' | 'I' | 'B' | 'F' | 'L' | 'P';

export interface ToothDefinition {
  fdi: string; // "18" .. "48"
  universal: string; // "1" .. "32"
  name: string;
  arch: Arch;
  quadrant: Quadrant;
  type: ToothType;
  surfaces: ToothSurface[];
}

export interface ConditionMeta {
  code: string;
  label: string;
  color: string;
  bg: string;
  borderColor: string;
}

export const TOOTH_CONDITIONS_CATALOG: Record<string, ConditionMeta> = {
  healthy: {
    code: 'healthy',
    label: 'Sound / Healthy',
    color: '#16a34a',
    bg: 'rgba(22, 163, 74, 0.12)',
    borderColor: '#16a34a',
  },
  caries: {
    code: 'caries',
    label: 'Caries / Cavity',
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.15)',
    borderColor: '#dc2626',
  },
  filling: {
    code: 'filling',
    label: 'Restoration / Filling',
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.15)',
    borderColor: '#2563eb',
  },
  crown: {
    code: 'crown',
    label: 'Crown',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.18)',
    borderColor: '#d97706',
  },
  root_canal: {
    code: 'root_canal',
    label: 'Root Canal Treated',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.15)',
    borderColor: '#7c3aed',
  },
  missing: {
    code: 'missing',
    label: 'Missing Tooth',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.25)',
    borderColor: '#64748b',
  },
  implant: {
    code: 'implant',
    label: 'Dental Implant',
    color: '#0891b2',
    bg: 'rgba(8, 145, 178, 0.18)',
    borderColor: '#0891b2',
  },
  bridge_abutment: {
    code: 'bridge_abutment',
    label: 'Bridge Abutment',
    color: '#4f46e5',
    bg: 'rgba(79, 70, 229, 0.15)',
    borderColor: '#4f46e5',
  },
  fracture: {
    code: 'fracture',
    label: 'Fractured Tooth',
    color: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.15)',
    borderColor: '#ea580c',
  },
  extraction_recommended: {
    code: 'extraction_recommended',
    label: 'Extraction Indicated',
    color: '#991b1b',
    bg: 'rgba(153, 27, 27, 0.2)',
    borderColor: '#991b1b',
  },
  watch: {
    code: 'watch',
    label: 'Watch / Monitor',
    color: '#ca8a04',
    bg: 'rgba(202, 138, 4, 0.15)',
    borderColor: '#ca8a04',
  },
};

/**
 * 32 Adult Permanent Teeth catalog.
 */
export const ADULT_TEETH: ToothDefinition[] = [
  // --- Maxillary Upper Right (Quadrant 1: 18 -> 11) ---
  { fdi: '18', universal: '1', name: 'Upper Right Third Molar (Wisdom)', arch: 'maxillary', quadrant: 1, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '17', universal: '2', name: 'Upper Right Second Molar', arch: 'maxillary', quadrant: 1, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '16', universal: '3', name: 'Upper Right First Molar', arch: 'maxillary', quadrant: 1, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '15', universal: '4', name: 'Upper Right Second Premolar', arch: 'maxillary', quadrant: 1, type: 'premolar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '14', universal: '5', name: 'Upper Right First Premolar', arch: 'maxillary', quadrant: 1, type: 'premolar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '13', universal: '6', name: 'Upper Right Canine (Cuspid)', arch: 'maxillary', quadrant: 1, type: 'canine', surfaces: ['M', 'D', 'I', 'F', 'L'] },
  { fdi: '12', universal: '7', name: 'Upper Right Lateral Incisor', arch: 'maxillary', quadrant: 1, type: 'incisor', surfaces: ['M', 'D', 'I', 'F', 'L'] },
  { fdi: '11', universal: '8', name: 'Upper Right Central Incisor', arch: 'maxillary', quadrant: 1, type: 'incisor', surfaces: ['M', 'D', 'I', 'F', 'L'] },

  // --- Maxillary Upper Left (Quadrant 2: 21 -> 28) ---
  { fdi: '21', universal: '9', name: 'Upper Left Central Incisor', arch: 'maxillary', quadrant: 2, type: 'incisor', surfaces: ['M', 'D', 'I', 'F', 'L'] },
  { fdi: '22', universal: '10', name: 'Upper Left Lateral Incisor', arch: 'maxillary', quadrant: 2, type: 'incisor', surfaces: ['M', 'D', 'I', 'F', 'L'] },
  { fdi: '23', universal: '11', name: 'Upper Left Canine (Cuspid)', arch: 'maxillary', quadrant: 2, type: 'canine', surfaces: ['M', 'D', 'I', 'F', 'L'] },
  { fdi: '24', universal: '12', name: 'Upper Left First Premolar', arch: 'maxillary', quadrant: 2, type: 'premolar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '25', universal: '13', name: 'Upper Left Second Premolar', arch: 'maxillary', quadrant: 2, type: 'premolar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '26', universal: '14', name: 'Upper Left First Molar', arch: 'maxillary', quadrant: 2, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '27', universal: '15', name: 'Upper Left Second Molar', arch: 'maxillary', quadrant: 2, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '28', universal: '16', name: 'Upper Left Third Molar (Wisdom)', arch: 'maxillary', quadrant: 2, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },

  // --- Mandibular Lower Left (Quadrant 3: 38 -> 31) ---
  { fdi: '38', universal: '17', name: 'Lower Left Third Molar (Wisdom)', arch: 'mandibular', quadrant: 3, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '37', universal: '18', name: 'Lower Left Second Molar', arch: 'mandibular', quadrant: 3, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '36', universal: '19', name: 'Lower Left First Molar', arch: 'mandibular', quadrant: 3, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '35', universal: '20', name: 'Lower Left Second Premolar', arch: 'mandibular', quadrant: 3, type: 'premolar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '34', universal: '21', name: 'Lower Left First Premolar', arch: 'mandibular', quadrant: 3, type: 'premolar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '33', universal: '22', name: 'Lower Left Canine (Cuspid)', arch: 'mandibular', quadrant: 3, type: 'canine', surfaces: ['M', 'D', 'I', 'F', 'L'] },
  { fdi: '32', universal: '23', name: 'Lower Left Lateral Incisor', arch: 'mandibular', quadrant: 3, type: 'incisor', surfaces: ['M', 'D', 'I', 'F', 'L'] },
  { fdi: '31', universal: '24', name: 'Lower Left Central Incisor', arch: 'mandibular', quadrant: 3, type: 'incisor', surfaces: ['M', 'D', 'I', 'F', 'L'] },

  // --- Mandibular Lower Right (Quadrant 4: 41 -> 48) ---
  { fdi: '41', universal: '25', name: 'Lower Right Central Incisor', arch: 'mandibular', quadrant: 4, type: 'incisor', surfaces: ['M', 'D', 'I', 'F', 'L'] },
  { fdi: '42', universal: '26', name: 'Lower Right Lateral Incisor', arch: 'mandibular', quadrant: 4, type: 'incisor', surfaces: ['M', 'D', 'I', 'F', 'L'] },
  { fdi: '43', universal: '27', name: 'Lower Right Canine (Cuspid)', arch: 'mandibular', quadrant: 4, type: 'canine', surfaces: ['M', 'D', 'I', 'F', 'L'] },
  { fdi: '44', universal: '28', name: 'Lower Right First Premolar', arch: 'mandibular', quadrant: 4, type: 'premolar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '45', universal: '29', name: 'Lower Right Second Premolar', arch: 'mandibular', quadrant: 4, type: 'premolar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '46', universal: '30', name: 'Lower Right First Molar', arch: 'mandibular', quadrant: 4, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '47', universal: '31', name: 'Lower Right Second Molar', arch: 'mandibular', quadrant: 4, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
  { fdi: '48', universal: '32', name: 'Lower Right Third Molar (Wisdom)', arch: 'mandibular', quadrant: 4, type: 'molar', surfaces: ['M', 'D', 'O', 'B', 'L'] },
];

const fdiMap = new Map<string, ToothDefinition>(ADULT_TEETH.map((t) => [t.fdi, t]));
const universalMap = new Map<string, ToothDefinition>(ADULT_TEETH.map((t) => [t.universal, t]));

export function getToothByFdi(fdi: string): ToothDefinition | undefined {
  return fdiMap.get(fdi);
}

export function getToothByUniversal(universal: string): ToothDefinition | undefined {
  return universalMap.get(universal);
}

export function fdiToUniversal(fdi: string): string | undefined {
  return fdiMap.get(fdi)?.universal;
}

export function universalToFdi(universal: string): string | undefined {
  return universalMap.get(universal)?.fdi;
}

export function getArchLayout() {
  const maxillaryRight = ADULT_TEETH.filter((t) => t.quadrant === 1); // 18 to 11
  const maxillaryLeft = ADULT_TEETH.filter((t) => t.quadrant === 2); // 21 to 28
  const mandibularLeft = ADULT_TEETH.filter((t) => t.quadrant === 3); // 38 to 31
  const mandibularRight = ADULT_TEETH.filter((t) => t.quadrant === 4); // 41 to 48

  return {
    upperArch: [...maxillaryRight, ...maxillaryLeft],
    lowerArch: [...mandibularRight.reverse(), ...mandibularLeft.reverse()],
  };
}
