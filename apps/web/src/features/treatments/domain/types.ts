export type TreatmentCategory =
  | 'preventive'
  | 'restorative'
  | 'endodontics'
  | 'prosthodontics'
  | 'periodontics'
  | 'oral_surgery'
  | 'orthodontics'
  | 'cosmetic';

export const TREATMENT_CATEGORIES: { id: TreatmentCategory; label: string; color: string }[] = [
  { id: 'preventive', label: 'Preventive', color: '#10b981' },
  { id: 'restorative', label: 'Restorative', color: '#3b82f6' },
  { id: 'endodontics', label: 'Endodontics', color: '#8b5cf6' },
  { id: 'prosthodontics', label: 'Prosthodontics', color: '#f59e0b' },
  { id: 'periodontics', label: 'Periodontics', color: '#ec4899' },
  { id: 'oral_surgery', label: 'Oral Surgery', color: '#ef4444' },
  { id: 'orthodontics', label: 'Orthodontics', color: '#06b6d4' },
  { id: 'cosmetic', label: 'Cosmetic', color: '#d946ef' },
];

export type TreatmentPlanStatus =
  | 'draft'
  | 'presented'
  | 'partially_accepted'
  | 'accepted'
  | 'declined'
  | 'deferred'
  | 'in_progress'
  | 'completed'
  | 'abandoned';

export type TreatmentItemStatus =
  | 'proposed'
  | 'accepted'
  | 'declined'
  | 'deferred'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TreatmentPriority = 'normal' | 'high' | 'urgent';

export interface TreatmentItemFinancialItem {
  price: string | number;
  discount?: string | number;
  status: string;
}

export interface DefaultTreatmentDefinition {
  code: string;
  name: string;
  category: TreatmentCategory;
  defaultDurationMinutes: number;
  defaultPrice: string;
  toothSpecific: boolean;
  surfaceSpecific: boolean;
}

export const DEFAULT_TREATMENT_CATALOG: DefaultTreatmentDefinition[] = [
  {
    code: 'CONS-01',
    name: 'Comprehensive Oral Examination',
    category: 'preventive',
    defaultDurationMinutes: 30,
    defaultPrice: '75.00',
    toothSpecific: false,
    surfaceSpecific: false,
  },
  {
    code: 'CLEAN-01',
    name: 'Adult Prophylaxis & Polish',
    category: 'preventive',
    defaultDurationMinutes: 45,
    defaultPrice: '120.00',
    toothSpecific: false,
    surfaceSpecific: false,
  },
  {
    code: 'FILL-1S',
    name: 'Composite Resin - 1 Surface',
    category: 'restorative',
    defaultDurationMinutes: 45,
    defaultPrice: '180.00',
    toothSpecific: true,
    surfaceSpecific: true,
  },
  {
    code: 'FILL-2S',
    name: 'Composite Resin - 2 Surfaces',
    category: 'restorative',
    defaultDurationMinutes: 60,
    defaultPrice: '240.00',
    toothSpecific: true,
    surfaceSpecific: true,
  },
  {
    code: 'RCT-MOL',
    name: 'Endodontic Therapy - Molar',
    category: 'endodontics',
    defaultDurationMinutes: 90,
    defaultPrice: '950.00',
    toothSpecific: true,
    surfaceSpecific: false,
  },
  {
    code: 'CRWN-ZIR',
    name: 'Crown - Full Zirconia',
    category: 'prosthodontics',
    defaultDurationMinutes: 60,
    defaultPrice: '1150.00',
    toothSpecific: true,
    surfaceSpecific: false,
  },
  {
    code: 'EXT-SMP',
    name: 'Simple Tooth Extraction',
    category: 'oral_surgery',
    defaultDurationMinutes: 45,
    defaultPrice: '220.00',
    toothSpecific: true,
    surfaceSpecific: false,
  },
  {
    code: 'SCAL-QUAD',
    name: 'Periodontal Scaling (Per Quadrant)',
    category: 'periodontics',
    defaultDurationMinutes: 45,
    defaultPrice: '260.00',
    toothSpecific: false,
    surfaceSpecific: false,
  },
];
