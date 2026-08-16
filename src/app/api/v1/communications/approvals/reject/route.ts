import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireAdmin, AuthenticatedContext, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth as AuthenticatedContext;
  const tenantId = user.tenantId;

  try {
    const body = await request.json();
    const { id, reason } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_ID", message: "Approval ID is required." },
        meta: null,
      }, { status: 400 });
    }

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

    const result = await prisma.$transaction(async (tx) => {
      const approvals = await tx.$queryRaw<any[]>`
        SELECT * FROM communications_approvals
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND status = 'PENDING_APPROVAL'
        LIMIT 1
      `;

      if (!approvals || approvals.length === 0) {
        throw new Error("Approval record not found or already processed.");
      }

      const item = approvals[0];
      const rejectionReason = reason || "Rejected by Customer Governance Director";

      await tx.$executeRaw`
        UPDATE communications_approvals
        SET status = 'REJECTED',
            rejection_reason = ${rejectionReason}
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      await tx.$executeRaw`
        UPDATE support_tickets
        SET status = 'RESOLVED'
        WHERE ticket_reference = ${item.ticket_reference} AND tenant_id = ${tenantId}::uuid
      `;

      await tx.$executeRaw`
        INSERT INTO customer_timelines (
          tenant_id, customer_name, unit_number, interaction_type, summary, officer_name, timestamp
        ) VALUES (
          ${tenantId}::uuid,
          ${item.customer_name},
          'Dispute Review',
          'Legal Escalation',
          ${`Rejected settlement claim for Ticket ${item.ticket_reference}: ${rejectionReason}`},
          ${user.fullName || "Governance Director"},
          NOW()
        )
      `;

      return item;
    });

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id, ticketReference: result.ticket_reference },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "COMMUNICATIONS_REJECT_ERROR",
        message: safeErrorMessage(err, "Dispute settlement could not be rejected"),
      },
      meta: null,
    }, { status: 500 });
  }
}
