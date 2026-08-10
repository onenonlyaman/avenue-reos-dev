import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { envelope, requireApiAccess } from "@/lib/apiAccess";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Every figure below is measured. Nothing on this endpoint reports a fixed "healthy"
 * value: if a subsystem cannot be measured, it is reported as UNKNOWN rather than green.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const dbStarted = Date.now();
  let databaseStatus: "CONNECTED" | "DEGRADED" | "DISCONNECTED" = "DISCONNECTED";
  let databaseLatencyMs = 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseLatencyMs = Date.now() - dbStarted;
    databaseStatus = databaseLatencyMs > 1000 ? "DEGRADED" : "CONNECTED";
  } catch (err) {
    console.error("[system/status] database probe failed", err);
    return envelope(503, {
      data: {
        databaseStatus: "DISCONNECTED",
        databaseLatencyMs: Date.now() - dbStarted,
        eventStreamStatus: "UNKNOWN",
        eventStreamFailuresLastHour: null,
        activeSessionCount: null,
        lastVerifiedUtc: new Date().toISOString(),
      },
      error: {
        code: "DATA_SERVICE_UNREACHABLE",
        message: "The data service did not respond to the health probe.",
      },
    });
  }

  let eventStreamStatus: "OPERATIONAL" | "DEGRADED" | "UNKNOWN" = "UNKNOWN";
  let eventStreamFailuresLastHour: number | null = null;

  try {
    const rows = await prisma.$queryRaw<{ failures: bigint }[]>`
      SELECT COUNT(*) AS failures
      FROM event_stream_logs
      WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid
        AND status = 'FAILED'
        AND created_at > NOW() - INTERVAL '1 hour'
    `;
    eventStreamFailuresLastHour = Number(rows[0]?.failures ?? 0);
    eventStreamStatus = eventStreamFailuresLastHour > 0 ? "DEGRADED" : "OPERATIONAL";
  } catch {
    // Register absent or unreadable: report UNKNOWN rather than asserting health.
  }

  let activeSessionCount: number | null = null;
  try {
    const rows = await prisma.$queryRaw<{ active: bigint }[]>`
      SELECT COUNT(*) AS active
      FROM system_sessions
      WHERE revoked_at IS NULL AND expires_at > NOW()
    `;
    activeSessionCount = Number(rows[0]?.active ?? 0);
  } catch {
    // Leave null.
  }

  return envelope(200, {
    data: {
      databaseStatus,
      databaseLatencyMs,
      eventStreamStatus,
      eventStreamFailuresLastHour,
      activeSessionCount,
      lastVerifiedUtc: new Date().toISOString(),
    },
  });
}
