import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:event_stream_logs", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS event_stream_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        event_name VARCHAR(100) NOT NULL,
        origin_module VARCHAR(100) NOT NULL,
        target_module VARCHAR(100) NOT NULL,
        payload_summary TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DELIVERED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM event_stream_logs WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC LIMIT 50
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      eventName: r.event_name,
      originModule: r.origin_module,
      targetModule: r.target_module,
      payloadSummary: r.payload_summary,
      timestamp: r.created_at,
      status: r.status,
    }));

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: { total_records: mapped.length },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: [],
      error: {
        code: "EVENT_STREAM_FETCH_ERROR",
        message: safeErrorMessage(err, "Platform event log could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}



