import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id, reason } = body;
    const tenantId = auth.user.tenantId;

    if (!id) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_ID", message: "Approval ID is required" },
        meta: null,
      }, { status: 400 });
    }

    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM integration_approvals 
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND status = 'PENDING_APPROVAL'
      LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "NOT_FOUND", message: "Pending integration approval request was not found or already processed" },
        meta: null,
      }, { status: 404 });
    }

    const item = existing[0];

    await prisma.$executeRaw`
      UPDATE integration_approvals
      SET status = 'REJECTED'
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    // Insert audit log
    await prisma.$executeRaw`
      INSERT INTO integration_logs (
        tenant_id, provider_name, endpoint, payload_type, response_status, latency_ms
      ) VALUES (
        ${tenantId}::uuid, ${item.connector_name}, '/approvals/reject',
        ${`Rejected: ${item.action_type} - ${reason || "Governance Rejection"}`}, 'FAILED', 110
      )
    `;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id, status: "REJECTED", reason: reason || "Rejected by Governance Director" },
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
        code: "INTEGRATION_REJECT_ERROR",
        message: safeErrorMessage(err, "Integration execution could not be rejected"),
      },
      meta: null,
    }, { status: 500 });
  }
}
