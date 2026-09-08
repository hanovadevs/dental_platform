/**
 * Test setup file.
 * Runs before all tests. Sets up environment variables for test database.
 */

// Use test database
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dental_test';
process.env.AUTH_SECRET = 'test-secret-minimum-32-characters-long-for-testing';
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';
