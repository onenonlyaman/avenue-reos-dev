import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;

    await runtimeDdl("table:communications_integrations", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS communications_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        service_name VARCHAR(100) NOT NULL,
        channel_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
        dispatched_24h INT NOT NULL DEFAULT 0,
        last_webhook_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM communications_integrations WHERE tenant_id = ${tenantId}::uuid ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      serviceName: r.service_name,
      channelType: r.channel_type,
      status: r.status,
      dispatched24h: Number(r.dispatched_24h || 0),
      lastWebhookTimestamp: r.last_webhook_timestamp,
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
        code: "COMMUNICATIONS_INTEGRATIONS_FETCH_ERROR",
        message: safeErrorMessage(err, "Communications integrations could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;
    const body = await request.json();

    const {
      serviceName,
      channelType,
      status = "CONNECTED",
      dispatched24h = 0,
    } = body;

    if (!serviceName || !channelType) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Service provider name and channel type are required." },
        meta: null,
      }, { status: 400 });
    }

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO communications_integrations (
        tenant_id, service_name, channel_type, status, dispatched_24h, last_webhook_timestamp
      ) VALUES (
        ${tenantId}::uuid,
        ${serviceName.trim()},
        ${channelType.trim()},
        ${status.trim().toUpperCase()},
        ${Number(dispatched24h) || 0},
        NOW()
      )
      RETURNING *
    `;

    const r = inserted[0];
    const mapped = {
      id: r.id,
      serviceName: r.service_name,
      channelType: r.channel_type,
      status: r.status,
      dispatched24h: Number(r.dispatched_24h || 0),
      lastWebhookTimestamp: r.last_webhook_timestamp,
    };

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: null,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "COMMUNICATIONS_INTEGRATION_CREATE_ERROR",
        message: safeErrorMessage(err, "Communications integration connector could not be registered"),
      },
      meta: null,
    }, { status: 500 });
  }
}
