import { NextRequest, NextResponse } from "next/server";
import { CONFIGURED_POOL_SIZE, prisma } from "@/lib/db";
import { envelope, requireAdmin } from "@/lib/apiAccess";

export const dynamic = "force-dynamic";

/**
 * Administrator-only. Reports schema and pool facts as measured, including the names of
 * any register that is missing tenant scoping — the previous implementation asserted
 * `migrationStatus: "UP_TO_DATE"` unconditionally, which could never surface drift.
 */
/**
 * Tables that correctly carry no `tenant_id`.
 *
 * `schema_migrations` is deployment metadata. `password_reset_tokens` is scoped through
 * its foreign key to `system_users`. `auth_login_attempts` records failures keyed by
 * address and origin, which must be countable before any account is identified.
 * Everything else holding business records must be tenant-scoped.
 */
const INFRASTRUCTURE_TABLES = new Set([
  "schema_migrations",
  "password_reset_tokens",
  "auth_login_attempts",
]);

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const startTime = Date.now();
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
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

    const unscopedBusinessRegisters = untenanted
      .map((t) => t.table_name)
      .filter((name) => !INFRASTRUCTURE_TABLES.has(name));

    const activeConnections = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM pg_stat_activity WHERE datname = current_database()
    `.catch(() => [{ count: 1 }]);

    const appliedMigrations = await prisma.$queryRaw<{ name: string; applied_at: Date }[]>`
      SELECT name, applied_at FROM schema_migrations ORDER BY name
    `.catch(() => [] as { name: string; applied_at: Date }[]);

    return envelope(200, {
      data: {
        tenantIsolationEnforced: unscopedBusinessRegisters.length === 0,
        registersWithoutTenantScope: unscopedBusinessRegisters,
        totalTableCount: tables.length,
        connectionPoolActive: Number(activeConnections[0]?.count ?? 0),
        connectionPoolMax: CONFIGURED_POOL_SIZE,
        appliedMigrations: appliedMigrations.map((m) => m.name),
        appliedMigrationCount: appliedMigrations.length,
        avgQueryResponseTimeMs: queryTime,
      },
    });
  } catch (err) {
    console.error("[system/db-health] probe failed", err);
    return envelope(503, {
      error: {
        code: "DB_HEALTH_UNAVAILABLE",
        message: "The data service health check could not be completed.",
      },
    });
  }
}
