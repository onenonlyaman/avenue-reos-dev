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
      SELECT id, agent_title, invoked_tool, parameters_summary, latency_ms, status, created_at
      FROM mcp_execution_logs
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      timestamp: r.created_at,
      agentTitle: r.agent_title,
      invokedTool: r.invoked_tool,
      parametersSummary: r.parameters_summary,
      latencyMs: Number(r.latency_ms || 0),
      status: r.status,
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
        code: "MCP_LOGS_FETCH_ERROR",
        message: safeErrorMessage(err, "Agent execution logs could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
