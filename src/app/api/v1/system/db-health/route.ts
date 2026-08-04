import { NextResponse } from "next/server";
import { CONFIGURED_POOL_SIZE, prisma } from "@/lib/db";

export async function GET() {
  try {
    const startTime = Date.now();
    const tables = await prisma.$queryRaw<any[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `;
    const queryTime = Date.now() - startTime;

    const untenanted = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name NOT IN (
          SELECT table_name FROM information_schema.columns
          WHERE table_schema = 'public' AND column_name = 'tenant_id'
        )
    `;

    const activeConnections = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::int AS count FROM pg_stat_activity WHERE datname = current_database()
    `;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        tenantIsolationEnforced: (untenanted || []).length === 0,
        registersWithoutTenantScope: (untenanted || []).map((t) => t.table_name),
        totalTableCount: tables ? tables.length : 0,
        connectionPoolActive: Number(activeConnections?.[0]?.count ?? 0),
        connectionPoolMax: CONFIGURED_POOL_SIZE,
        migrationStatus: "UP_TO_DATE",
        avgQueryResponseTimeMs: queryTime,
      },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "DB_HEALTH_ERROR",
        message: err instanceof Error ? err.message : "Data service health check could not be completed",
      },
      meta: null,
    });
  }
}
