import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:mcp_execution_logs", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS mcp_execution_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        agent_title VARCHAR(255) NOT NULL,
        invoked_tool VARCHAR(100) NOT NULL,
        parameters_summary TEXT NOT NULL,
        latency_ms INT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM mcp_execution_logs WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC LIMIT 50
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



