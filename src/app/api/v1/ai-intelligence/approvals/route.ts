import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ai_intelligence_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        target_reference VARCHAR(255) NOT NULL,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        justification TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM ai_intelligence_approvals WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND status = 'PENDING_APPROVAL' ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      targetReference: r.target_reference,
      amount: Number(r.amount || 0),
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
        code: "AI_APPROVALS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "AI intelligence approvals could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

