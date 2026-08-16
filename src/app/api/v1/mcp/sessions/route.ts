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
      SELECT id, agent_title, assigned_scope, origin_ip, permission_level, last_ping, session_status
      FROM mcp_agent_sessions
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY last_ping DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      agentTitle: r.agent_title,
      assignedScope: r.assigned_scope,
      originIp: r.origin_ip,
      permissionLevel: r.permission_level,
      lastPing: r.last_ping,
      sessionStatus: r.session_status,
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
        code: "MCP_SESSIONS_FETCH_ERROR",
        message: safeErrorMessage(err, "Active agent sessions could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
