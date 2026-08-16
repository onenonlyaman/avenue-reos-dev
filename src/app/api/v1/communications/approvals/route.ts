import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, AuthenticatedContext, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth as AuthenticatedContext;
  const tenantId = user.tenantId;

  try {
    await runtimeDdl("table:communications_approvals", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS communications_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        ticket_reference VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        issue_summary TEXT NOT NULL,
        claim_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        justification TEXT NOT NULL,
        rejection_reason TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM communications_approvals
      WHERE tenant_id = ${tenantId}::uuid AND status = 'PENDING_APPROVAL'
      ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      ticketReference: r.ticket_reference,
      customerName: r.customer_name,
      issueSummary: r.issue_summary,
      claimAmount: Number(r.claim_amount || 0),
      justification: r.justification,
      rejectionReason: r.rejection_reason || null,
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
        code: "COMMUNICATIONS_APPROVALS_FETCH_ERROR",
        message: safeErrorMessage(err, "Communications approvals could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
