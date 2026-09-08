import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { organizations, locations } from './organizations';
import { memberships } from './auth';

/**
 * Staff profiles.
 * Associated with an organization membership.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 3).
 */
export const staffProfiles = pgTable('staff_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  membershipId: uuid('membership_id')
    .notNull()
    .references(() => memberships.id),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  jobTitle: varchar('job_title', { length: 100 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Dentist profiles.
 * Additional practitioner attributes for clinical staff.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 3).
 */
export const dentistProfiles = pgTable('dentist_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  staffProfileId: uuid('staff_profile_id')
    .notNull()
    .references(() => staffProfiles.id),
  licenseNumber: varchar('license_number', { length: 100 }),
  specialty: varchar('specialty', { length: 100 }).notNull().default('General Dentistry'),
  defaultAppointmentDuration: integer('default_appointment_duration')
    .notNull()
    .default(30), // In minutes
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Staff availability.
 * Recurring weekly working hours by practitioner and location.
 * Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
export const staffAvailability = pgTable('staff_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  staffProfileId: uuid('staff_profile_id')
    .notNull()
    .references(() => staffProfiles.id),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0-6
  startTime: varchar('start_time', { length: 8 }).notNull(), // HH:MM:SS or HH:MM
  endTime: varchar('end_time', { length: 8 }).notNull(), // HH:MM:SS or HH:MM
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Operating chairs.
 * Clinic operatory rooms/chairs per location.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 8).
 */
export const chairs = pgTable('chairs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id),
  name: varchar('name', { length: 100 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
