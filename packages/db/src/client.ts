import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/dental_dev';

const isProduction = process.env.NODE_ENV === 'production';
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || isProduction);

// Detect Supabase Supavisor or PgBouncer transaction pooling (port 6543 or explicit param)
const isPooler =
  connectionString.includes(':6543') ||
  connectionString.includes('pooler.supabase.com') ||
  connectionString.includes('pgbouncer=true') ||
  process.env.DB_PREPARE === 'false';

// Max connections per container/lambda: 1 in serverless prevents connection exhaustion under burst concurrency
const maxConnections = process.env.DB_MAX_CONNECTIONS
  ? Number(process.env.DB_MAX_CONNECTIONS)
  : (isServerless ? 1 : 10);

declare global {
  // eslint-disable-next-line no-var
  var __db_queryClient__: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var __db_instance__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function getDatabaseClient() {
  if (globalThis.__db_instance__) {
    return globalThis.__db_instance__;
  }

  const isSsl = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

  const queryClient = postgres(connectionString, {
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: !isPooler, // Required false for Supabase transaction pooler (port 6543)
    ssl: isSsl ? 'require' : false,
  });

  const dbInstance = drizzle(queryClient, { schema });

  if (process.env.NODE_ENV !== 'production' || isServerless) {
    globalThis.__db_queryClient__ = queryClient;
    globalThis.__db_instance__ = dbInstance;
  }

  return dbInstance;
}

export const db = getDatabaseClient();

// Connection for migrations (single, non-pooled, direct connection)
export function createMigrationClient() {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) {
    throw new Error('DIRECT_URL or DATABASE_URL is required for migrations');
  }
  const isSsl = !directUrl.includes('localhost') && !directUrl.includes('127.0.0.1');
  const migrationClient = postgres(directUrl, {
    max: 1,
    prepare: true,
    ssl: isSsl ? 'require' : false,
  });
  return drizzle(migrationClient, { schema });
}

export type Database = typeof db;
