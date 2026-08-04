import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS integration_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        connector_name VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        sync_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        justification TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM integration_approvals WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND status = 'PENDING_APPROVAL' ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      connectorName: r.connector_name,
      actionType: r.action_type,
      syncAmount: Number(r.sync_amount || 0),
      justification: r.justification,
      status: r.status,
      requiresHitl: Boolean(r.requires_hitl),
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
        code: "INTEGRATION_APPROVALS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Pending integration approvals could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

