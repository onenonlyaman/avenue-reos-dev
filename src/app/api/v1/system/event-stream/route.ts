import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { envelope, requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId;

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
      SELECT * FROM event_stream_logs 
      WHERE tenant_id = ${tenantId}::uuid 
      ORDER BY created_at DESC 
      LIMIT 50
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

    return envelope(200, {
      data: mapped,
      meta: { total_records: mapped.length },
    });
  } catch (err: unknown) {
    return envelope(500, {
      data: [],
      error: {
        code: "EVENT_STREAM_FETCH_ERROR",
        message: safeErrorMessage(err, "Platform event log could not be loaded"),
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId;

  try {
    const body = await request.json();
    const {
      eventName,
      originModule,
      targetModule,
      payloadSummary,
      status = "DELIVERED",
    } = body;

    if (!eventName || !originModule || !targetModule || !payloadSummary) {
      return envelope(400, {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Event name, origin, target, and payload summary are required." },
      });
    }

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO event_stream_logs (
        tenant_id, event_name, origin_module, target_module, payload_summary, status
      ) VALUES (
        ${tenantId}::uuid,
        ${eventName.trim()},
        ${originModule.trim()},
        ${targetModule.trim()},
        ${payloadSummary.trim()},
        ${status.trim().toUpperCase()}
      )
      RETURNING *
    `;

    const r = inserted[0];
    const mapped = {
      id: r.id,
      eventName: r.event_name,
      originModule: r.origin_module,
      targetModule: r.target_module,
      payloadSummary: r.payload_summary,
      timestamp: r.created_at,
      status: r.status,
    };

    return envelope(201, {
      data: mapped,
    });
  } catch (err: unknown) {
    return envelope(500, {
      data: null,
      error: {
        code: "EVENT_STREAM_CREATE_ERROR",
        message: safeErrorMessage(err, "Event stream entry could not be logged"),
      },
    });
  }
}
