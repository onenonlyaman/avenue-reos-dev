import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS mcp_agent_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        agent_title VARCHAR(255) NOT NULL,
        assigned_scope VARCHAR(100) NOT NULL,
        origin_ip VARCHAR(50) NOT NULL,
        permission_level VARCHAR(50) NOT NULL DEFAULT 'READ_ONLY',
        last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        session_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM mcp_agent_sessions WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY last_ping DESC
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
        message: err instanceof Error ? err.message : "Active agent sessions could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}



