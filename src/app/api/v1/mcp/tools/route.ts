import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS mcp_registered_tools (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        tool_name VARCHAR(100) UNIQUE NOT NULL,
        target_module VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        is_mutative BOOLEAN NOT NULL DEFAULT false,
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        execution_count INT NOT NULL DEFAULT 0,
        schema_input TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM mcp_registered_tools WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY tool_name ASC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      toolName: r.tool_name,
      targetModule: r.target_module,
      description: r.description,
      isMutative: Boolean(r.is_mutative),
      requiresHitl: Boolean(r.requires_hitl),
      executionCount: Number(r.execution_count || 0),
      schemaInput: r.schema_input,
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
        code: "MCP_TOOLS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Registered agent tools could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}



