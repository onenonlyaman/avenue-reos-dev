import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsonrpc, method, params, id } = body;

    if (jsonrpc !== "2.0") {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request: Expected JSON-RPC 2.0" },
        id: id || null,
      });
    }

    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: { listChanged: true }, resources: { subscribe: true } },
          serverInfo: { name: "Avenue-Builders-MCP-Gateway", version: "1.0.0" },
        },
        id,
      });
    }

    if (method === "tools/list") {
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

      const tools = (raw || []).map((t: any) => ({
        name: t.tool_name,
        description: t.description,
        inputSchema: JSON.parse(t.schema_input || "{}"),
      }));

      return NextResponse.json({
        jsonrpc: "2.0",
        result: { tools },
        id,
      });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params || {};
      const tenantId = ACTIVE_TENANT_ID;

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

      const toolRecord = await prisma.$queryRaw<any[]>`
        SELECT * FROM mcp_registered_tools WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND tool_name = ${name} LIMIT 1
      `;

      const isMutativeTool = Boolean(args?.requires_hitl || name?.includes("issue_purchase_order") || name?.includes("disburse") || name?.includes("execute") || (toolRecord && toolRecord.length > 0 && toolRecord[0]?.requires_hitl));

      if (isMutativeTool) {
        await prisma.$executeRaw`
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
        `;

        await prisma.$executeRaw`
          INSERT INTO mcp_approvals (
            tenant_id, agent_title, invoked_tool, target_module, parameters_summary, justification, status, requires_hitl
          ) VALUES (
            ${tenantId}::uuid, 'Autonomous Agent', ${name}, ${toolRecord && toolRecord.length > 0 ? toolRecord[0].target_module : 'PROCUREMENT'},
            ${JSON.stringify(args || {})}, 'Mutative high-risk tool call intercepted by Governance Policy',
            'PENDING_APPROVAL', true
          )
        `;

        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: 403,
            message: "HITL_APPROVAL_REQUIRED: High-risk mutative execution paused for Governance Director authorization.",
          },
          id,
        });
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: "EXECUTED", tool: name, result: "Query completed successfully" }),
            },
          ],
        },
        id,
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32601, message: `Method not found: ${method}` },
      id,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32603, message: err instanceof Error ? err.message : "Internal JSON-RPC error" },
      id: null,
    });
  }
}



