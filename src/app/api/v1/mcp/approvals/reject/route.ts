import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = typeof auth === "object" && auth.user?.tenantId ? auth.user.tenantId : ACTIVE_TENANT_ID;

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
        error: { code: "MISSING_ID", message: "Approval ID is required" },
        meta: null,
      }, { status: 400 });
    }

    const rejectionReason = reason || "Denied by Governance Director";

    // 1. Fetch item to ensure existence and tenant ownership
    const approvalRows = await prisma.$queryRaw<any[]>`
      SELECT id, agent_title, invoked_tool, parameters_summary
      FROM mcp_approvals
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;

    if (approvalRows.length === 0) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "NOT_FOUND", message: "Approval request not found for this tenant." },
        meta: null,
      }, { status: 404 });
    }

    const item = approvalRows[0];

    // 2. Mark as REJECTED with reason
    await prisma.$executeRaw`
      UPDATE mcp_approvals
      SET status = 'REJECTED',
          rejection_reason = ${rejectionReason},
          executed_at = NOW()
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    // 3. Log rejection into execution logs
    await prisma.$executeRaw`
      INSERT INTO mcp_execution_logs (
        tenant_id, agent_title, invoked_tool, parameters_summary, latency_ms, status
      ) VALUES (
        ${tenantId}::uuid, ${item.agent_title}, ${item.invoked_tool},
        ${item.parameters_summary}, 5, 'FAILED'
      )
    `;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id, status: "REJECTED", reason: rejectionReason },
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
        code: "MCP_REJECT_ERROR",
        message: safeErrorMessage(err, "AI tool execution could not be rejected"),
      },
      meta: null,
    }, { status: 500 });
  }
}
