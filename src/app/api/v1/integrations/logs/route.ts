import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;

    await runtimeDdl("table:integration_logs", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS integration_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        provider_name VARCHAR(100) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        payload_type VARCHAR(100) NOT NULL,
        response_status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
        latency_ms INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM integration_logs WHERE tenant_id = ${tenantId}::uuid ORDER BY created_at DESC LIMIT 100
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      timestamp: r.created_at,
      providerName: r.provider_name,
      endpoint: r.endpoint,
      payloadType: r.payload_type,
      responseStatus: r.response_status,
      latencyMs: Number(r.latency_ms || 0),
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
        code: "INTEGRATION_LOGS_FETCH_ERROR",
        message: safeErrorMessage(err, "Integration logs could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
