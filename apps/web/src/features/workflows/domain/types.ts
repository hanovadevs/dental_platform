/**
 * Clinic Workflows Domain Types (Inventory, Dental Lab, Prescriptions & Documents)
 * Per spec (01_PRODUCT_SCOPE_AND_REQUIREMENTS.md Sections 3.14, 3.16, 3.17)
 */

// --- Inventory Types ---

export const INVENTORY_CATEGORIES = [
  'restorative',
  'anesthetic',
  'endodontic',
  'orthodontic',
  'ppe',
  'disposable',
  'preventive',
  'instrument',
  'general',
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const INVENTORY_UNITS = [
  'pcs',
  'box',
  'syringe',
  'bottle',
  'vial',
  'pack',
  'roll',
] as const;

export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

export const INVENTORY_TRANSACTION_TYPES = [
  'stock_in',
  'stock_used',
  'stock_adjusted',
  'wasted',
  'expired',
] as const;

export type InventoryTransactionType = (typeof INVENTORY_TRANSACTION_TYPES)[number];

// --- Dental Lab Types ---

export const LAB_WORK_TYPES = [
  'crown',
  'bridge',
  'denture',
  'implant_abutment',
  'inlay_onlay',
  'veneer',
  'aligner',
  'night_guard',
  'orthodontic_appliance',
  'other',
] as const;

export type LabWorkType = (typeof LAB_WORK_TYPES)[number];

export const LAB_CASE_STATUSES = [
  'prepared',
  'sent',
  'in_production',
  'received',
  'fitted',
  'rework',
  'cancelled',
] as const;

export type LabCaseStatus = (typeof LAB_CASE_STATUSES)[number];

// --- Prescription & Medication Types ---

export const MEDICATION_FORMS = [
  'tablet',
  'capsule',
  'liquid',
  'suspension',
  'rinse',
  'ointment',
  'gel',
] as const;

export type MedicationForm = (typeof MEDICATION_FORMS)[number];

export const PRESCRIPTION_STATUSES = ['active', 'completed', 'cancelled'] as const;
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

// --- Document & Consent Types ---

export const DOCUMENT_TYPES = [
  'consent_form',
  'medical_history',
  'treatment_plan',
  'invoice',
  'prescription',
  'external_upload',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = [
  'draft',
  'pending_signature',
  'signed',
  'archived',
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

// --- Pre-Seeded Default Medication Templates ---

export interface DefaultMedicationTemplate {
  name: string;
  medicationName: string;
  dosage: string;
  form: MedicationForm;
  frequency: string;
  durationDays: number;
  instructions: string;
}

export const DEFAULT_MEDICATION_TEMPLATES: DefaultMedicationTemplate[] = [
  {
    name: 'Amoxicillin 500mg (Odontogenic Infection)',
    medicationName: 'Amoxicillin',
    dosage: '500 mg',
    form: 'capsule',
    frequency: 'One capsule every 8 hours (3 times daily)',
    durationDays: 7,
    instructions: 'Take with or without food. Complete the full 7-day course even if symptoms subside.',
  },
  {
    name: 'Augmentin 625mg (Refractory/Severe Infection)',
    medicationName: 'Amoxicillin + Clavulanic Acid',
    dosage: '625 mg (500/125 mg)',
    form: 'tablet',
    frequency: 'One tablet twice daily with meals',
    durationDays: 7,
    instructions: 'Take at the start of a meal to reduce gastrointestinal discomfort. Complete entire course.',
  },
  {
    name: 'Ibuprofen 600mg (Post-Operative Analgesic)',
    medicationName: 'Ibuprofen',
    dosage: '600 mg',
    form: 'tablet',
    frequency: 'One tablet every 6 to 8 hours as needed for pain',
    durationDays: 5,
    instructions: 'Take with food or milk to protect stomach. Do not exceed 2400mg in 24 hours.',
  },
  {
    name: 'Acetaminophen 500mg (Mild-Moderate Pain)',
    medicationName: 'Acetaminophen / Paracetamol',
    dosage: '500 mg',
    form: 'tablet',
    frequency: 'One to two tablets every 6 hours as needed for pain',
    durationDays: 4,
    instructions: 'Do not exceed 3000mg per 24 hours. Avoid concurrent alcohol consumption.',
  },
  {
    name: 'Chlorhexidine 0.12% Oral Rinse (Perio / Post-Surg)',
    medicationName: 'Chlorhexidine Gluconate 0.12%',
    dosage: '15 mL',
    form: 'rinse',
    frequency: 'Swish 15mL twice daily for 30 seconds after brushing',
    durationDays: 14,
    instructions: 'Swish vigorously and expectorate. Do not swallow. Avoid eating or drinking for 30 minutes after use.',
  },
];

// --- Pre-Seeded Default Consent Templates ---

export interface DefaultConsentTemplate {
  title: string;
  category: string;
  body: string;
}

export const DEFAULT_CONSENT_TEMPLATES: DefaultConsentTemplate[] = [
  {
    title: 'General Dental Treatment & Local Anesthesia Consent',
    category: 'general',
    body: `I hereby authorize the clinical team to perform examination, dental radiography, diagnosis, and routine restorative or prophylactic procedures as discussed. 

1. Local Anesthesia: I understand that local anesthesia carries minor risks including prolonged numbness, hematoma, or transient heart rate changes.
2. Treatment Alternatives: Feasible treatment alternatives, potential risks of non-treatment, and expected benefits have been explained to my satisfaction.
3. Patient Disclosure: I confirm that I have accurately disclosed my complete medical history, medications, and allergies.`,
  },
  {
    title: 'Informed Consent for Endodontic (Root Canal) Therapy',
    category: 'endodontic',
    body: `I consent to root canal therapy on the designated tooth. 

1. Purpose: Root canal therapy is an attempt to retain a tooth that would otherwise require extraction due to pulpal necrosis or infection.
2. Anticipated Risks: Potential complications include instrument separation within the canal, perforation, calcified canals requiring surgical intervention, or persistent infection requiring re-treatment or apicoectomy.
3. Final Restoration: I acknowledge that endodontically treated posterior teeth become brittle and typically necessitate a protective coronal restoration (crown) to prevent fracture.`,
  },
  {
    title: 'Informed Consent for Dental Extraction & Oral Surgery',
    category: 'surgical',
    body: `I authorize the removal of the identified tooth/teeth.

1. Surgical Risks: Common risks include post-operative pain, bleeding, swelling, bruising, infection, localized osteitis ("dry socket"), and adjacent tooth or restoration damage.
2. Nerve Sensitivity: In rare instances, proximity to the mandibular or lingual nerve can cause transient or permanent altered sensation (paresthesia) in the lower lip, chin, or tongue.
3. Post-Operative Instructions: I agree to strictly follow post-extraction care guidelines, including avoiding vigorous rinsing, smoking, and using straws for 48 hours.`,
  },
  {
    title: 'Informed Consent for Crown, Bridge & Prosthetic Restorations',
    category: 'prosthodontic',
    body: `I consent to the tooth preparation, impression/scanning, and placement of crown/bridge prosthetics.

1. Tooth Preparation: I understand that tooth structure reduction is required and may occasionally cause pulpal irritation requiring root canal therapy.
2. Shade & Aesthetics: Shade selection is verified prior to lab fabrication; once bonded, shade alterations require replacement at laboratory cost.
3. Fit & Longevity: Maintaining strict oral hygiene, regular cleanings, and avoiding unyielding forces (e.g. ice, hard candy, teeth grinding) are critical for restoration longevity.`,
  },
];
