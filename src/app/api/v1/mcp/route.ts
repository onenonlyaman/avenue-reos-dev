import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureMcpSchema } from "@/lib/mcp/ensureMcpSchema";
import { executeMcpTool } from "@/lib/mcp/toolExecutor";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = typeof auth === "object" && auth.user?.tenantId ? auth.user.tenantId : ACTIVE_TENANT_ID;
  const operatorName = typeof auth === "object" && auth.user?.fullName ? auth.user.fullName : "Autonomous Agent";
  const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

  try {
    await ensureMcpSchema(tenantId);

    const body = await request.json();
    const { jsonrpc, method, params, id } = body;

    if (jsonrpc !== "2.0") {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request: Expected JSON-RPC 2.0 protocol" },
        id: id || null,
      });
    }

    if (method === "initialize") {
      const agentTitle = params?.clientInfo?.name || operatorName || "External MCP Agent Client";

      // Upsert active agent session in DB safely
      const existingSession = await prisma.$queryRaw<any[]>`
        SELECT id FROM mcp_agent_sessions WHERE tenant_id = ${tenantId}::uuid AND agent_title = ${agentTitle} LIMIT 1
      `;

      if (existingSession.length === 0) {
        await prisma.$executeRaw`
          INSERT INTO mcp_agent_sessions (
            tenant_id, agent_title, assigned_scope, origin_ip, permission_level, last_ping, session_status
          ) VALUES (
            ${tenantId}::uuid, ${agentTitle}, 'ENTERPRISE_CORE_MODULES', ${clientIp}, 'MUTATIVE_HITL', NOW(), 'ACTIVE'
          )
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE mcp_agent_sessions
          SET last_ping = NOW(), session_status = 'ACTIVE', origin_ip = ${clientIp}
          WHERE tenant_id = ${tenantId}::uuid AND agent_title = ${agentTitle}
        `;
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: true },
          },
          serverInfo: {
            name: "Avenue-Enterprise-MCP-Gateway",
            version: "1.0.0",
          },
        },
        id,
      });
    }

    if (method === "tools/list") {
      const tools = await prisma.$queryRaw<any[]>`
        SELECT tool_name, description, schema_input
        FROM mcp_registered_tools
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY tool_name ASC
      `;

      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          tools: (tools || []).map((t) => ({
            name: t.tool_name,
            description: t.description,
            inputSchema: JSON.parse(t.schema_input || "{}"),
          })),
        },
        id,
      });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params || {};
      const startTime = Date.now();

      if (!name) {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: { code: -32602, message: "Invalid params: 'name' of tool is required" },
          id,
        });
      }

      // Check tool definition in DB
      const toolRecords = await prisma.$queryRaw<any[]>`
        SELECT tool_name, target_module, is_mutative, requires_hitl
        FROM mcp_registered_tools
        WHERE tenant_id = ${tenantId}::uuid AND tool_name = ${name}
        LIMIT 1
      `;

      const toolDef = toolRecords[0];
      const isHighRisk = Boolean(
        toolDef?.requires_hitl ||
        args?.requires_hitl ||
        name.includes("sales_booking") ||
        (name.includes("procurement_po") && Number(args?.total_amount || 0) > 100000) ||
        (name.includes("tally_post_voucher") && Number(args?.totalAmount || 0) > 1000000) ||
        name.includes("payroll_process")
      );

      // If high-risk and not explicitly pre-approved by a human director, pause and escrow in mcp_approvals
      if (isHighRisk) {
        const targetModule = toolDef?.target_module || "FINANCE";
        const paramStr = JSON.stringify(args || {});

        const approvalRows = await prisma.$queryRaw<any[]>`
          INSERT INTO mcp_approvals (
            tenant_id, agent_title, invoked_tool, target_module, parameters_summary, justification, status, requires_hitl
          ) VALUES (
            ${tenantId}::uuid, ${operatorName}, ${name}, ${targetModule},
            ${paramStr}, 'High-risk mutative tool call intercepted by Avenue Governance Policy',
            'PENDING_APPROVAL', true
          )
          RETURNING id
        `;

        const approvalId = approvalRows[0]?.id;
        const latency = Date.now() - startTime;

        // Log interception
        await prisma.$executeRaw`
          INSERT INTO mcp_execution_logs (
            tenant_id, agent_title, invoked_tool, parameters_summary, latency_ms, status
          ) VALUES (
            ${tenantId}::uuid, ${operatorName}, ${name}, ${paramStr}, ${latency}, 'HITL_INTERCEPTED'
          )
        `;

        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: 403,
            message: `HITL_APPROVAL_REQUIRED: High-risk mutative execution paused for Governance Director authorization. Escrow Reference: ${approvalId}`,
          },
          id,
        });
      }

      // Execute autonomous tool directly against database
      const executionResult = await executeMcpTool(name, args, tenantId, "ai-mcp-autonomous-agent");
      const latency = Date.now() - startTime;

      // Log execution to DB
      await prisma.$executeRaw`
        INSERT INTO mcp_execution_logs (
          tenant_id, agent_title, invoked_tool, parameters_summary, latency_ms, status
        ) VALUES (
          ${tenantId}::uuid, ${operatorName}, ${name}, ${JSON.stringify(args || {})},
          ${latency}, ${executionResult.success ? 'SUCCESS' : 'FAILED'}
        )
      `;

      if (!executionResult.success) {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: executionResult.error || "Tool execution failed",
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
              text: JSON.stringify(executionResult.data),
            },
          ],
        },
        id,
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32601, message: `Method '${method}' not found` },
      id,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32603, message: safeErrorMessage(err, "Internal JSON-RPC Error") },
      id: null,
    });
  }
}
