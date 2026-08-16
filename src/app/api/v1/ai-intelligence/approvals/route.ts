import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:ai_intelligence_approvals", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ai_intelligence_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        target_reference VARCHAR(255) NOT NULL,
        target_id UUID,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        justification TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        rejection_reason TEXT,
        approved_by VARCHAR(255),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM ai_intelligence_approvals
      WHERE tenant_id = ${auth.user.tenantId}::uuid AND status = 'PENDING_APPROVAL'
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      targetReference: r.target_reference,
      targetId: r.target_id || null,
      amount: Number(r.amount || 0),
      justification: r.justification,
      status: r.status,
      requiresHitl: Boolean(r.requires_hitl),
      rejectionReason: r.rejection_reason || null,
      approvedBy: r.approved_by || null,
      reviewedAt: r.reviewed_at || null,
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
        message: safeErrorMessage(err, "AI intelligence approvals could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
