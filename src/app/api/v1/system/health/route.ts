import { NextResponse } from "next/server";
import { assertDatabaseReachable } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated liveness/readiness probe for the reverse proxy and process manager.
 *
 * Deliberately minimal: it reports whether the process can reach its database and
 * nothing else. Schema details, pool figures and register names are behind
 * authentication on /api/v1/system/db-health.
 */
export async function GET() {
  const started = Date.now();
  try {
    await assertDatabaseReachable();
    return NextResponse.json(
      { status: "ok", database: "reachable", latencyMs: Date.now() - started },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "unreachable", latencyMs: Date.now() - started },
      { status: 503 }
    );
  }
}
