import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:mcp_approvals", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS mcp_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        agent_title VARCHAR(255) NOT NULL,
        invoked_tool VARCHAR(100) NOT NULL,
        target_module VARCHAR(100) NOT NULL,
        parameters_summary TEXT NOT NULL,
        justification TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM mcp_approvals WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND status = 'PENDING_APPROVAL' ORDER BY created_at DESC
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

