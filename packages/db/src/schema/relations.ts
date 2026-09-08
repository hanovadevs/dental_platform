import { relations } from 'drizzle-orm';
import { organizations, locations } from './organizations';
import { users } from './users';
import { roles, permissions, rolePermissions, memberships, membershipLocations } from './auth';
import { auditEvents } from './audit';
import { staffProfiles, dentistProfiles, staffAvailability, chairs } from './staff';
import { patients, patientEmergencyContacts, medicalAlerts, allergies } from './patients';
import { toothConditions, clinicalNotes } from './clinical';

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
}));

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  createdMedicalAlerts: many(medicalAlerts),
  recordedToothConditions: many(toothConditions),
  signedClinicalNotes: many(clinicalNotes),
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
export const chairsRelations = relations(chairs, ({ one }) => ({
  organization: one(organizations, {
    fields: [chairs.organizationId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [chairs.locationId],
    references: [locations.id],
  }),
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
