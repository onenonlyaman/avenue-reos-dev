import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureMcpSchema } from "@/lib/mcp/ensureMcpSchema";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId;

  try {
    await ensureMcpSchema(tenantId);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT id, tool_name, target_module, description, is_mutative, requires_hitl, execution_count, schema_input
      FROM mcp_registered_tools
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY tool_name ASC
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
        message: safeErrorMessage(err, "Registered agent tools could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId;

  try {
    await ensureMcpSchema(tenantId);
    const body = await request.json();

    const {
      toolName,
      targetModule,
      description,
      isMutative = false,
      requiresHitl = false,
      schemaInput,
    } = body;

    if (!toolName || !targetModule || !description) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Tool name, target module, and description are required." },
        meta: null,
      }, { status: 400 });
    }

    const jsonSchema = typeof schemaInput === "object" ? JSON.stringify(schemaInput) : (schemaInput || "{}");

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO mcp_registered_tools (
        tenant_id, tool_name, target_module, description, is_mutative, requires_hitl, execution_count, schema_input
      ) VALUES (
        ${tenantId}::uuid,
        ${toolName.trim()},
        ${targetModule.trim()},
        ${description.trim()},
        ${Boolean(isMutative)},
        ${Boolean(requiresHitl)},
        0,
        ${jsonSchema}::jsonb
      )
      ON CONFLICT (tenant_id, tool_name) 
      DO UPDATE SET 
        target_module = EXCLUDED.target_module,
        description = EXCLUDED.description,
        is_mutative = EXCLUDED.is_mutative,
        requires_hitl = EXCLUDED.requires_hitl,
        schema_input = EXCLUDED.schema_input
      RETURNING *
    `;

    const r = inserted[0];
    const mapped = {
      id: r.id,
      toolName: r.tool_name,
      targetModule: r.target_module,
      description: r.description,
      isMutative: Boolean(r.is_mutative),
      requiresHitl: Boolean(r.requires_hitl),
      executionCount: Number(r.execution_count || 0),
      schemaInput: r.schema_input,
    };

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: null,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "MCP_TOOL_REGISTER_ERROR",
        message: safeErrorMessage(err, "MCP Tool could not be registered"),
      },
      meta: null,
    }, { status: 500 });
  }
}
