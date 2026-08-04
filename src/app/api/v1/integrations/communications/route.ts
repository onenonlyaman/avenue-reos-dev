import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
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
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM communications_integrations WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
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
        message: err instanceof Error ? err.message : "Communications integrations could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}



