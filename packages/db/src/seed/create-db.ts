import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

const rootDir = resolve(import.meta.dirname, '../../../../');
config({ path: resolve(rootDir, '.env.local') });
config({ path: resolve(rootDir, '.env') });
config({ path: resolve(import.meta.dirname, '../../.env.local') });

async function createDatabase() {
  const url = process.env.DATABASE_URL;
  console.log('Detected DATABASE_URL from .env.local');

  // Connect to default 'postgres' database
  // Note: if user password is 'The123!@', we pass it directly to postgres options:
  const adminClient = postgres({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    username: 'postgres',
    password: 'The123!@',
  });

  try {
    const check = await adminClient`SELECT 1 as connected`;
    console.log('✓ Successfully connected to PostgreSQL server on localhost:5432!');

    const existing = await adminClient`SELECT datname FROM pg_database WHERE datname = 'dental_dev'`;
    if (existing.length === 0) {
      console.log('Creating database "dental_dev"...');
      await adminClient`CREATE DATABASE dental_dev`;
      console.log('✓ Database "dental_dev" created successfully!');
    } else {
      console.log('✓ Database "dental_dev" already exists.');
    }
  } catch (err: any) {
    console.error('Connection failed:', err.message);
  } finally {
    await adminClient.end();
  }
}

createDatabase();
