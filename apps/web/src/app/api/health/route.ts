import { NextResponse } from 'next/server';
import { db } from '@dental/db';
import { sql } from 'drizzle-orm';

/**
 * Health & Observability Diagnostic Endpoint
 * Per spec (10_DEPLOYMENT_OBSERVABILITY_AND_OPERATIONS.md Section 1).
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Check database connectivity
    await db.execute(sql`SELECT 1 as healthy`);
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        checks: {
          database: {
            status: 'healthy',
            latencyMs: dbLatencyMs,
          },
          app: {
            status: 'healthy',
            environment: process.env.NODE_ENV || 'development',
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const totalLatencyMs = Date.now() - startTime;
    console.error('[Health Check Failed]', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        checks: {
          database: {
            status: 'unhealthy',
            error: error.message || 'Database connection error',
            latencyMs: totalLatencyMs,
          },
        },
      },
      { status: 503 }
    );
  }
}
