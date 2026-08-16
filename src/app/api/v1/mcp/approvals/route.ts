import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureMcpSchema } from "@/lib/mcp/ensureMcpSchema";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = typeof auth === "object" && auth.user?.tenantId ? auth.user.tenantId : ACTIVE_TENANT_ID;

  try {
    await ensureMcpSchema(tenantId);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT id, agent_title, invoked_tool, target_module, parameters_summary, justification, status, requires_hitl, rejection_reason, created_at
      FROM mcp_approvals
      WHERE tenant_id = ${tenantId}::uuid AND status = 'PENDING_APPROVAL'
      ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      agentTitle: r.agent_title,
      invokedTool: r.invoked_tool,
      targetModule: r.target_module,
      parametersSummary: r.parameters_summary,
      justification: r.justification,
      status: r.status,
      requiresHitl: Boolean(r.requires_hitl),
      rejectionReason: r.rejection_reason || null,
      createdAt: r.created_at,
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
        code: "MCP_APPROVALS_FETCH_ERROR",
        message: safeErrorMessage(err, "Pending MCP approvals could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
