import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hr_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        reference_name VARCHAR(255) NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        justification TEXT NOT NULL,
        requested_by VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM hr_approvals WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND status = 'PENDING_APPROVAL' ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      type: r.type,
      referenceName: r.reference_name,
      amount: Number(r.amount || 0),
      justification: r.justification,
      requestedBy: r.requested_by,
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
        code: "HR_APPROVALS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "HR pending approvals could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

