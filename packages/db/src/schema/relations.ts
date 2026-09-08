import { relations } from 'drizzle-orm';
import { organizations, locations } from './organizations';
import { users } from './users';
import { roles, permissions, rolePermissions, memberships, membershipLocations } from './auth';
import { auditEvents } from './audit';
import { staffProfiles, dentistProfiles, staffAvailability, chairs } from './staff';
import { patients, patientEmergencyContacts, medicalAlerts, allergies } from './patients';
import { toothConditions, clinicalNotes } from './clinical';
import {
  appointmentTypes,
  appointments,
  appointmentStatusHistory,
  waitingListEntries,
} from './scheduling';
import {
  treatmentDefinitions,
  treatmentPlans,
  treatmentPlanItems,
  procedures,
} from './treatments';
import { invoices, invoiceItems, payments } from './billing';
import {
  revenueOpportunities,
  revenueAttributions,
  opportunityOutreachLogs,
  recallRules,
  recalls,
} from './revenue';
import {
  communications,
  communicationConsents,
  communicationTemplates,
  communicationRules,
  confirmationTokens,
} from './communications';

/**
 * Drizzle ORM relation definitions.
 * These enable the query API (db.query.X.findFirst/findMany with `with` clauses).
 */

// Organization relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  locations: many(locations),
  memberships: many(memberships),
  roles: many(roles),
  auditEvents: many(auditEvents),
  staffProfiles: many(staffProfiles),
  chairs: many(chairs),
  patients: many(patients),
  toothConditions: many(toothConditions),
  clinicalNotes: many(clinicalNotes),
  appointmentTypes: many(appointmentTypes),
  appointments: many(appointments),
  waitingListEntries: many(waitingListEntries),
  treatmentDefinitions: many(treatmentDefinitions),
  treatmentPlans: many(treatmentPlans),
  procedures: many(procedures),
  invoices: many(invoices),
  payments: many(payments),
  revenueOpportunities: many(revenueOpportunities),
  revenueAttributions: many(revenueAttributions),
  opportunityOutreachLogs: many(opportunityOutreachLogs),
  recallRules: many(recallRules),
  recalls: many(recalls),
  communications: many(communications),
  communicationConsents: many(communicationConsents),
  communicationTemplates: many(communicationTemplates),
  communicationRules: many(communicationRules),
  confirmationTokens: many(confirmationTokens),
}));

// Location relations
export const locationsRelations = relations(locations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [locations.organizationId],
    references: [organizations.id],
  }),
  chairs: many(chairs),
  patients: many(patients),
  staffAvailability: many(staffAvailability),
  appointments: many(appointments),
  waitingListEntries: many(waitingListEntries),
  treatmentPlans: many(treatmentPlans),
  invoices: many(invoices),
  revenueOpportunities: many(revenueOpportunities),
}));

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  createdMedicalAlerts: many(medicalAlerts),
  recordedToothConditions: many(toothConditions),
  signedClinicalNotes: many(clinicalNotes),
  createdAppointments: many(appointments),
  appointmentStatusChanges: many(appointmentStatusHistory),
  recordedPayments: many(payments),
  assignedOpportunities: many(revenueOpportunities),
  performedOutreachLogs: many(opportunityOutreachLogs),
  sentCommunications: many(communications),
}));

// Role relations
export const rolesRelations = relations(roles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id],
  }),
  rolePermissions: many(rolePermissions),
  memberships: many(memberships),
}));

// Membership relations
export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [memberships.roleId],
    references: [roles.id],
  }),
  membershipLocations: many(membershipLocations),
  staffProfile: one(staffProfiles),
}));

// MembershipLocation relations
export const membershipLocationsRelations = relations(membershipLocations, ({ one }) => ({
  membership: one(memberships, {
    fields: [membershipLocations.membershipId],
    references: [memberships.id],
  }),
  location: one(locations, {
    fields: [membershipLocations.locationId],
    references: [locations.id],
  }),
}));

// RolePermission relations
export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// Audit event relations
export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditEvents.organizationId],
    references: [organizations.id],
  }),
  actor: one(users, {
    fields: [auditEvents.actorUserId],
    references: [users.id],
  }),
}));

// StaffProfile relations
export const staffProfilesRelations = relations(staffProfiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [staffProfiles.organizationId],
    references: [organizations.id],
  }),
  membership: one(memberships, {
    fields: [staffProfiles.membershipId],
    references: [memberships.id],
  }),
  dentistProfile: one(dentistProfiles),
  availability: many(staffAvailability),
  primaryPatients: many(patients),
  clinicalNotes: many(clinicalNotes),
  appointments: many(appointments),
  treatmentPlans: many(treatmentPlans),
  performedProcedures: many(procedures),
}));

// DentistProfile relations
export const dentistProfilesRelations = relations(dentistProfiles, ({ one }) => ({
  organization: one(organizations, {
    fields: [dentistProfiles.organizationId],
    references: [organizations.id],
  }),
  staffProfile: one(staffProfiles, {
    fields: [dentistProfiles.staffProfileId],
    references: [staffProfiles.id],
  }),
}));

// StaffAvailability relations
export const staffAvailabilityRelations = relations(staffAvailability, ({ one }) => ({
  organization: one(organizations, {
    fields: [staffAvailability.organizationId],
    references: [organizations.id],
  }),
  staffProfile: one(staffProfiles, {
    fields: [staffAvailability.staffProfileId],
    references: [staffProfiles.id],
  }),
  location: one(locations, {
    fields: [staffAvailability.locationId],
    references: [locations.id],
  }),
}));

// Chairs relations
export const chairsRelations = relations(chairs, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [chairs.organizationId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [chairs.locationId],
    references: [locations.id],
  }),
  appointments: many(appointments),
}));

// Patients relations
export const patientsRelations = relations(patients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [patients.organizationId],
    references: [organizations.id],
  }),
  primaryLocation: one(locations, {
    fields: [patients.primaryLocationId],
    references: [locations.id],
  }),
  primaryDentist: one(staffProfiles, {
    fields: [patients.primaryDentistId],
    references: [staffProfiles.id],
  }),
  emergencyContacts: many(patientEmergencyContacts),
  medicalAlerts: many(medicalAlerts),
  allergies: many(allergies),
  toothConditions: many(toothConditions),
  clinicalNotes: many(clinicalNotes),
  appointments: many(appointments),
  waitingListEntries: many(waitingListEntries),
  treatmentPlans: many(treatmentPlans),
  procedures: many(procedures),
  invoices: many(invoices),
  payments: many(payments),
  revenueOpportunities: many(revenueOpportunities),
  opportunityOutreachLogs: many(opportunityOutreachLogs),
  recalls: many(recalls),
  communications: many(communications),
  communicationConsents: many(communicationConsents),
}));

// PatientEmergencyContact relations
export const patientEmergencyContactsRelations = relations(patientEmergencyContacts, ({ one }) => ({
  organization: one(organizations, {
    fields: [patientEmergencyContacts.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [patientEmergencyContacts.patientId],
    references: [patients.id],
  }),
}));

// MedicalAlerts relations
export const medicalAlertsRelations = relations(medicalAlerts, ({ one }) => ({
  organization: one(organizations, {
    fields: [medicalAlerts.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [medicalAlerts.patientId],
    references: [patients.id],
  }),
  creator: one(users, {
    fields: [medicalAlerts.createdBy],
    references: [users.id],
  }),
}));

// Allergies relations
export const allergiesRelations = relations(allergies, ({ one }) => ({
  organization: one(organizations, {
    fields: [allergies.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [allergies.patientId],
    references: [patients.id],
  }),
}));

// ToothConditions relations
export const toothConditionsRelations = relations(toothConditions, ({ one }) => ({
  organization: one(organizations, {
    fields: [toothConditions.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [toothConditions.patientId],
    references: [patients.id],
  }),
  recorder: one(users, {
    fields: [toothConditions.recordedBy],
    references: [users.id],
  }),
  supersedes: one(toothConditions, {
    fields: [toothConditions.supersedesId],
    references: [toothConditions.id],
  }),
}));

// ClinicalNotes relations
export const clinicalNotesRelations = relations(clinicalNotes, ({ one }) => ({
  organization: one(organizations, {
    fields: [clinicalNotes.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [clinicalNotes.patientId],
    references: [patients.id],
  }),
  dentist: one(staffProfiles, {
    fields: [clinicalNotes.dentistId],
    references: [staffProfiles.id],
  }),
  author: one(users, {
    fields: [clinicalNotes.signedBy],
    references: [users.id],
  }),
}));

// AppointmentTypes relations
export const appointmentTypesRelations = relations(appointmentTypes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [appointmentTypes.organizationId],
    references: [organizations.id],
  }),
  appointments: many(appointments),
}));

// Appointments relations
export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [appointments.organizationId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [appointments.locationId],
    references: [locations.id],
  }),
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  dentist: one(staffProfiles, {
    fields: [appointments.dentistId],
    references: [staffProfiles.id],
  }),
  chair: one(chairs, {
    fields: [appointments.chairId],
    references: [chairs.id],
  }),
  appointmentType: one(appointmentTypes, {
    fields: [appointments.appointmentTypeId],
    references: [appointmentTypes.id],
  }),
  creator: one(users, {
    fields: [appointments.createdBy],
    references: [users.id],
  }),
  statusHistory: many(appointmentStatusHistory),
  procedures: many(procedures),
  revenueOpportunities: many(revenueOpportunities),
  bookedRecalls: many(recalls),
  communications: many(communications),
  confirmationTokens: many(confirmationTokens),
}));

// AppointmentStatusHistory relations
export const appointmentStatusHistoryRelations = relations(appointmentStatusHistory, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointmentStatusHistory.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [appointmentStatusHistory.appointmentId],
    references: [appointments.id],
  }),
  changer: one(users, {
    fields: [appointmentStatusHistory.changedBy],
    references: [users.id],
  }),
}));

// WaitingListEntries relations
export const waitingListEntriesRelations = relations(waitingListEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [waitingListEntries.organizationId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [waitingListEntries.locationId],
    references: [locations.id],
  }),
  patient: one(patients, {
    fields: [waitingListEntries.patientId],
    references: [patients.id],
  }),
  preferredDentist: one(staffProfiles, {
    fields: [waitingListEntries.preferredDentistId],
    references: [staffProfiles.id],
  }),
  appointmentType: one(appointmentTypes, {
    fields: [waitingListEntries.appointmentTypeId],
    references: [appointmentTypes.id],
  }),
}));

// TreatmentDefinitions relations
export const treatmentDefinitionsRelations = relations(treatmentDefinitions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [treatmentDefinitions.organizationId],
    references: [organizations.id],
  }),
  planItems: many(treatmentPlanItems),
  procedures: many(procedures),
  recallRules: many(recallRules),
}));

// TreatmentPlans relations
export const treatmentPlansRelations = relations(treatmentPlans, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [treatmentPlans.organizationId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [treatmentPlans.locationId],
    references: [locations.id],
  }),
  patient: one(patients, {
    fields: [treatmentPlans.patientId],
    references: [patients.id],
  }),
  dentist: one(staffProfiles, {
    fields: [treatmentPlans.dentistId],
    references: [staffProfiles.id],
  }),
  items: many(treatmentPlanItems),
  revenueOpportunities: many(revenueOpportunities),
}));

// TreatmentPlanItems relations
export const treatmentPlanItemsRelations = relations(treatmentPlanItems, ({ one }) => ({
  treatmentPlan: one(treatmentPlans, {
    fields: [treatmentPlanItems.treatmentPlanId],
    references: [treatmentPlans.id],
  }),
  treatmentDefinition: one(treatmentDefinitions, {
    fields: [treatmentPlanItems.treatmentDefinitionId],
    references: [treatmentDefinitions.id],
  }),
  procedure: one(procedures),
  invoiceItem: one(invoiceItems),
}));

// Procedures relations
export const proceduresRelations = relations(procedures, ({ one }) => ({
  organization: one(organizations, {
    fields: [procedures.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [procedures.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [procedures.appointmentId],
    references: [appointments.id],
  }),
  treatmentPlanItem: one(treatmentPlanItems, {
    fields: [procedures.treatmentPlanItemId],
    references: [treatmentPlanItems.id],
  }),
  treatmentDefinition: one(treatmentDefinitions, {
    fields: [procedures.treatmentDefinitionId],
    references: [treatmentDefinitions.id],
  }),
  dentist: one(staffProfiles, {
    fields: [procedures.dentistId],
    references: [staffProfiles.id],
  }),
  invoiceItem: one(invoiceItems),
}));

// Invoices relations
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [invoices.locationId],
    references: [locations.id],
  }),
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
  revenueOpportunities: many(revenueOpportunities),
}));

// InvoiceItems relations
export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  procedure: one(procedures, {
    fields: [invoiceItems.procedureId],
    references: [procedures.id],
  }),
  treatmentPlanItem: one(treatmentPlanItems, {
    fields: [invoiceItems.treatmentPlanItemId],
    references: [treatmentPlanItems.id],
  }),
}));

// Payments relations
export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  patient: one(patients, {
    fields: [payments.patientId],
    references: [patients.id],
  }),
  recorder: one(users, {
    fields: [payments.recordedBy],
    references: [users.id],
  }),
}));

// RevenueOpportunities relations
export const revenueOpportunitiesRelations = relations(revenueOpportunities, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [revenueOpportunities.organizationId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [revenueOpportunities.locationId],
    references: [locations.id],
  }),
  patient: one(patients, {
    fields: [revenueOpportunities.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [revenueOpportunities.appointmentId],
    references: [appointments.id],
  }),
  treatmentPlan: one(treatmentPlans, {
    fields: [revenueOpportunities.treatmentPlanId],
    references: [treatmentPlans.id],
  }),
  invoice: one(invoices, {
    fields: [revenueOpportunities.invoiceId],
    references: [invoices.id],
  }),
  assignee: one(users, {
    fields: [revenueOpportunities.assignedTo],
    references: [users.id],
  }),
  outreachLogs: many(opportunityOutreachLogs),
  attributions: many(revenueAttributions),
  communications: many(communications),
}));

// RevenueAttributions relations
export const revenueAttributionsRelations = relations(revenueAttributions, ({ one }) => ({
  organization: one(organizations, {
    fields: [revenueAttributions.organizationId],
    references: [organizations.id],
  }),
  opportunity: one(revenueOpportunities, {
    fields: [revenueAttributions.opportunityId],
    references: [revenueOpportunities.id],
  }),
}));

// OpportunityOutreachLogs relations
export const opportunityOutreachLogsRelations = relations(opportunityOutreachLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [opportunityOutreachLogs.organizationId],
    references: [organizations.id],
  }),
  opportunity: one(revenueOpportunities, {
    fields: [opportunityOutreachLogs.opportunityId],
    references: [revenueOpportunities.id],
  }),
  patient: one(patients, {
    fields: [opportunityOutreachLogs.patientId],
    references: [patients.id],
  }),
  actor: one(users, {
    fields: [opportunityOutreachLogs.performedBy],
    references: [users.id],
  }),
}));

// RecallRules relations
export const recallRulesRelations = relations(recallRules, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [recallRules.organizationId],
    references: [organizations.id],
  }),
  treatmentDefinition: one(treatmentDefinitions, {
    fields: [recallRules.treatmentDefinitionId],
    references: [treatmentDefinitions.id],
  }),
  recalls: many(recalls),
}));

// Recalls relations
export const recallsRelations = relations(recalls, ({ one }) => ({
  organization: one(organizations, {
    fields: [recalls.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [recalls.patientId],
    references: [patients.id],
  }),
  rule: one(recallRules, {
    fields: [recalls.ruleId],
    references: [recallRules.id],
  }),
  bookedAppointment: one(appointments, {
    fields: [recalls.bookedAppointmentId],
    references: [appointments.id],
  }),
}));

// CommunicationTemplates relations
export const communicationTemplatesRelations = relations(communicationTemplates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [communicationTemplates.organizationId],
    references: [organizations.id],
  }),
  communications: many(communications),
  rules: many(communicationRules),
}));

// CommunicationRules relations
export const communicationRulesRelations = relations(communicationRules, ({ one }) => ({
  organization: one(organizations, {
    fields: [communicationRules.organizationId],
    references: [organizations.id],
  }),
  template: one(communicationTemplates, {
    fields: [communicationRules.templateId],
    references: [communicationTemplates.id],
  }),
}));

// CommunicationConsents relations
export const communicationConsentsRelations = relations(communicationConsents, ({ one }) => ({
  organization: one(organizations, {
    fields: [communicationConsents.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [communicationConsents.patientId],
    references: [patients.id],
  }),
}));

// Communications relations
export const communicationsRelations = relations(communications, ({ one }) => ({
  organization: one(organizations, {
    fields: [communications.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [communications.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [communications.appointmentId],
    references: [appointments.id],
  }),
  opportunity: one(revenueOpportunities, {
    fields: [communications.opportunityId],
    references: [revenueOpportunities.id],
  }),
  template: one(communicationTemplates, {
    fields: [communications.templateId],
    references: [communicationTemplates.id],
  }),
  sender: one(users, {
    fields: [communications.sentBy],
    references: [users.id],
  }),
}));

// ConfirmationTokens relations
export const confirmationTokensRelations = relations(confirmationTokens, ({ one }) => ({
  organization: one(organizations, {
    fields: [confirmationTokens.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [confirmationTokens.appointmentId],
    references: [appointments.id],
  }),
}));

