import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/dental_dev';

// Connection for queries (pooled)
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

// Connection for migrations (single, non-pooled)
export function createMigrationClient() {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for migrations');
  }
  const migrationClient = postgres(connectionString, { max: 1 });
  return drizzle(migrationClient, { schema });
}

export type Database = typeof db;
