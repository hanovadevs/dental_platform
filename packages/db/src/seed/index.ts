import { db } from '../client';
import { organizations, locations } from '../schema/organizations';
import { users } from '../schema/users';
import { roles, permissions, rolePermissions, memberships, membershipLocations } from '../schema/auth';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLES } from './defaults';
import { randomUUID } from 'crypto';

/**
 * Seed the database with a demo clinic, admin user, and default roles/permissions.
 * Idempotent: checks for existing data before inserting.
 */
async function seed() {
  console.log('Seeding database...');

  // 1. Insert permissions (system-wide, idempotent via ON CONFLICT)
  console.log('  Creating permissions...');
  const permissionRecords: Record<string, string> = {};
  for (const perm of DEFAULT_PERMISSIONS) {
    const id = randomUUID();
    const [inserted] = await db
      .insert(permissions)
      .values({
        id,
        code: perm.code,
        name: perm.name,
        description: `Permission: ${perm.name}`,
        module: perm.module,
      })
      .onConflictDoNothing({ target: permissions.code })
      .returning();

    if (inserted) {
      permissionRecords[perm.code] = inserted.id;
    }
  }

  // If permissions already exist, fetch them
  if (Object.keys(permissionRecords).length === 0) {
    console.log('  Permissions already exist, fetching...');
    const existing = await db.select().from(permissions);
    for (const p of existing) {
      permissionRecords[p.code] = p.id;
    }
  }

  // 2. Create demo organization
  console.log('  Creating demo organization...');
  const [org] = await db
    .insert(organizations)
    .values({
      name: 'Demo Dental Clinic',
      slug: 'demo-dental',
      defaultCurrency: 'PKR',
      defaultTimezone: 'Asia/Karachi',
      phone: '+92 300 1234567',
      email: 'admin@demodental.local',
    })
    .onConflictDoNothing()
    .returning();

  if (!org) {
    console.log('  Demo organization already exists. Skipping seed.');
    process.exit(0);
  }

  // 3. Create location
  console.log('  Creating demo location...');
  const [location] = await db
    .insert(locations)
    .values({
      organizationId: org.id,
      name: 'Main Branch',
      address: '123 Dental Street, Lahore, Pakistan',
      phone: '+92 300 1234567',
      timezone: 'Asia/Karachi',
    })
    .returning();

  // 4. Create roles for this organization
  console.log('  Creating roles...');
  const roleRecords: Record<string, string> = {};
  for (const [roleName, roleDef] of Object.entries(DEFAULT_ROLES)) {
    const [role] = await db
      .insert(roles)
      .values({
        organizationId: org.id,
        name: roleName,
        description: roleDef.description,
        isSystem: 'true',
      })
      .returning();

    if (role) {
      roleRecords[roleName] = role.id;

      // Map permissions to role
      for (const permCode of roleDef.permissions) {
        const permId = permissionRecords[permCode];
        if (permId) {
          await db
            .insert(rolePermissions)
            .values({
              roleId: role.id,
              permissionId: permId,
            })
            .onConflictDoNothing();
        }
      }
    }
  }

  // 5. Create demo admin user (password: "admin123")
  console.log('  Creating demo admin user...');
  // Using a pre-computed bcrypt hash for "admin123" to avoid bcrypt dependency in seed
  const bcryptHash = '$2b$10$K4GxMn3FjZwI3mZ7bQ2gNO8g3vTqE5Qs0LR3a8wJcK4pP9fH7sXOa';

  const [adminUser] = await db
    .insert(users)
    .values({
      email: 'admin@demodental.local',
      passwordHash: bcryptHash,
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    })
    .returning();

  // 6. Create membership (admin as Owner)
  console.log('  Creating membership...');
  const [membership] = await db
    .insert(memberships)
    .values({
      organizationId: org.id,
      userId: adminUser!.id,
      roleId: roleRecords['Owner']!,
      status: 'active',
    })
    .returning();

  // 7. Grant location access
  if (membership && location) {
    await db.insert(membershipLocations).values({
      membershipId: membership.id,
      locationId: location.id,
    });
  }

  console.log('Seed complete!');
  console.log(`  Organization: ${org.name} (${org.slug})`);
  console.log(`  Location: ${location!.name}`);
  console.log(`  Admin: admin@demodental.local`);
  console.log(`  Roles: ${Object.keys(roleRecords).join(', ')}`);
  console.log(`  Permissions: ${Object.keys(permissionRecords).length}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
