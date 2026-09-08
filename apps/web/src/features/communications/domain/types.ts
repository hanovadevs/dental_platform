/**
 * Communication Domain Types.
 * Per spec (01_PRODUCT_SCOPE_AND_REQUIREMENTS.md Section 3.13, 05_DATA_MODEL_AND_DOMAIN.md Section 17, 08_SECURITY_PRIVACY_AND_AUDIT.md Section 13).
 */

export const COMMUNICATION_CHANNELS = [
  'email',
  'sms',
  'whatsapp',
  'phone',
  'internal_note',
] as const;

export type CommunicationChannel = typeof COMMUNICATION_CHANNELS[number];

export const COMMUNICATION_DIRECTIONS = ['outbound', 'inbound'] as const;
export type CommunicationDirection = typeof COMMUNICATION_DIRECTIONS[number];

export const COMMUNICATION_STATUSES = [
  'pending',
  'queued',
  'sent',
  'delivered',
  'failed',
  'received',
] as const;

export type CommunicationStatus = typeof COMMUNICATION_STATUSES[number];

export const TEMPLATE_CATEGORIES = [
  'appointment_reminder',
  'appointment_confirmation',
  'recall',
  'payment_reminder',
  'treatment_followup',
  'custom',
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

export const CONSENT_CATEGORIES = [
  'operational',
  'marketing',
  'recalls',
  'billing',
] as const;

export type ConsentCategory = typeof CONSENT_CATEGORIES[number];

export const TRIGGER_EVENTS = [
  'appointment_scheduled',
  'appointment_reminder_24h',
  'recall_due',
  'recall_overdue',
  'invoice_due',
  'opportunity_detected',
] as const;

export type TriggerEvent = typeof TRIGGER_EVENTS[number];

export interface TemplateVariables {
  patientName?: string;
  patientFirstName?: string;
  clinicName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  dentistName?: string;
  chairName?: string;
  confirmationUrl?: string;
  balanceDue?: string;
  invoiceNumber?: string;
  recallDueDate?: string;
  treatmentPlanTitle?: string;
  [key: string]: string | undefined;
}

export interface DefaultTemplateConfig {
  name: string;
  category: TemplateCategory;
  channel: CommunicationChannel;
  subject?: string;
  body: string;
}

export const DEFAULT_COMMUNICATION_TEMPLATES: DefaultTemplateConfig[] = [
  {
    name: 'Appointment Reminder (24h) - SMS',
    category: 'appointment_reminder',
    channel: 'sms',
    body: 'Hi {{patientFirstName}}, this is a reminder of your appointment at {{clinicName}} on {{appointmentDate}} at {{appointmentTime}} with Dr. {{dentistName}}. Confirm here: {{confirmationUrl}} (Reply STOP to opt out)',
  },
  {
    name: 'Appointment Reminder (24h) - Email',
    category: 'appointment_reminder',
    channel: 'email',
    subject: 'Upcoming Appointment Reminder - {{clinicName}}',
    body: 'Dear {{patientName}},\n\nThis is a friendly reminder for your upcoming dental visit at {{clinicName}}.\n\nDate: {{appointmentDate}}\nTime: {{appointmentTime}}\nDentist: Dr. {{dentistName}}\n\nPlease confirm your visit using this link:\n{{confirmationUrl}}\n\nWarm regards,\n{{clinicName}}',
  },
  {
    name: 'Appointment Booking Confirmation - SMS',
    category: 'appointment_confirmation',
    channel: 'sms',
    body: 'Hi {{patientFirstName}}, your visit at {{clinicName}} is confirmed for {{appointmentDate}} at {{appointmentTime}}. See you soon!',
  },
  {
    name: 'Routine Hygiene Recall Notice - SMS',
    category: 'recall',
    channel: 'sms',
    body: 'Hi {{patientFirstName}}, you are due for your routine dental exam and cleaning at {{clinicName}}. Call us or book your visit today to protect your smile! (Reply STOP to opt out)',
  },
  {
    name: 'Outstanding Balance Notice - Email',
    category: 'payment_reminder',
    channel: 'email',
    subject: 'Statement of Account - Invoice #{{invoiceNumber}} - {{clinicName}}',
    body: 'Dear {{patientName}},\n\nOur records indicate an outstanding balance of {{balanceDue}} on invoice #{{invoiceNumber}} with {{clinicName}}.\n\nPlease contact our office or settle your account at your earliest convenience.\n\nThank you,\n{{clinicName}} Billing Team',
  },
  {
    name: 'Treatment Plan Follow-up - WhatsApp/SMS',
    category: 'treatment_followup',
    channel: 'whatsapp',
    body: 'Hello {{patientFirstName}}, following your recent visit to {{clinicName}}, we wanted to check if you had questions about your treatment plan ({{treatmentPlanTitle}}). Our team is here to help with scheduling and payment plan options!',
  },
];
