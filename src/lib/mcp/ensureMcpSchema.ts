import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export const DEFAULT_MCP_TOOLS = [
  {
    toolName: "crm_leads_list",
    targetModule: "CRM",
    description: "Retrieves real estate leads pipeline with optional filtering.",
    isMutative: false,
    requiresHitl: false,
    schemaInput: JSON.stringify({
      type: "object",
      properties: {
        status: { type: "string", enum: ["NEW", "CONTACTED", "SITE_VISIT_SCHEDULED", "QUALIFIED", "LOST", "CONVERTED"] },
        limit: { type: "integer", default: 20 },
      },
    }),
  },
  {
    toolName: "crm_leads_create",
    targetModule: "CRM",
    description: "Creates a new customer lead in the CRM pipeline.",
    isMutative: true,
    requiresHitl: false,
    schemaInput: JSON.stringify({
      type: "object",
      required: ["full_name", "email", "phone", "lead_source"],
      properties: {
        full_name: { type: "string" },
        email: { type: "string", format: "email" },
        phone: { type: "string" },
        lead_source: { type: "string" },
      },
    }),
  },
  {
    toolName: "sales_booking_create",
    targetModule: "SALES",
    description: "Reserves a real estate unit and creates a binding sales booking. REQUIRES HUMAN APPROVAL.",
    isMutative: true,
    requiresHitl: true,
    schemaInput: JSON.stringify({
      type: "object",
      required: ["customer_id", "unit_id", "agreed_total_price", "payment_plan_id"],
      properties: {
        customer_id: { type: "string", format: "uuid" },
        unit_id: { type: "string", format: "uuid" },
        agreed_total_price: { type: "number" },
        payment_plan_id: { type: "string" },
      },
    }),
  },
  {
    toolName: "finance_budgets_list",
    targetModule: "FINANCE",
    description: "Queries project cost centers and committed budget allocations.",
    isMutative: false,
    requiresHitl: false,
    schemaInput: JSON.stringify({
      type: "object",
      properties: {
        project_id: { type: "string", format: "uuid" },
      },
    }),
  },
  {
    toolName: "procurement_po_create",
    targetModule: "PROCUREMENT",
    description: "Issues a formal Purchase Order to a vendor. REQUIRES HUMAN APPROVAL FOR HIGH AMOUNTS.",
    isMutative: true,
    requiresHitl: true,
    schemaInput: JSON.stringify({
      type: "object",
      required: ["vendor_id", "cost_center_id", "total_amount", "items"],
      properties: {
        vendor_id: { type: "string", format: "uuid" },
        cost_center_id: { type: "string", format: "uuid" },
        total_amount: { type: "number" },
        items: { type: "array", items: { type: "object" } },
      },
    }),
  },
  {
    toolName: "construction_dpr_create",
    targetModule: "CONSTRUCTION",
    description: "Submits Daily Progress Report (DPR) for a construction site.",
    isMutative: true,
    requiresHitl: false,
    schemaInput: JSON.stringify({
      type: "object",
      required: ["site_id", "labor_count", "progress_percentage", "work_details"],
      properties: {
        site_id: { type: "string", format: "uuid" },
        labor_count: { type: "integer" },
        progress_percentage: { type: "number" },
        work_details: { type: "object" },
      },
    }),
  },
  {
    toolName: "hr_payroll_process",
    targetModule: "HR",
    description: "Executes monthly payroll disbursement run. REQUIRES HUMAN APPROVAL.",
    isMutative: true,
    requiresHitl: true,
    schemaInput: JSON.stringify({
      type: "object",
      required: ["period_start", "period_end"],
      properties: {
        period_start: { type: "string", format: "date" },
        period_end: { type: "string", format: "date" },
      },
    }),
  },
  {
    toolName: "comm_messages_send",
    targetModule: "COMMUNICATIONS",
    description: "Sends a structured markdown communication message to a team or customer channel.",
    isMutative: true,
    requiresHitl: false,
    schemaInput: JSON.stringify({
      type: "object",
      required: ["destination", "content_markdown_json"],
      properties: {
        destination: { type: "string" },
        content_markdown_json: { type: "object" },
      },
    }),
  },
  {
    toolName: "tally_query_ledger_balances",
    targetModule: "FINANCE_TALLY",
    description: "Inspect Chart of Accounts current balances and group details.",
    isMutative: false,
    requiresHitl: false,
    schemaInput: JSON.stringify({
      type: "object",
      properties: {
        primaryGroup: { type: "string" },
      },
    }),
  },
  {
    toolName: "tally_post_voucher",
    targetModule: "FINANCE_TALLY",
    description: "Post a double-entry voucher entry in Tally ERP system. REQUIRES HUMAN APPROVAL FOR > ₹10 Lakhs.",
    isMutative: true,
    requiresHitl: true,
    schemaInput: JSON.stringify({
      type: "object",
      required: ["voucherType", "debitLedgerId", "creditLedgerId", "totalAmount"],
      properties: {
        voucherType: { type: "string" },
        debitLedgerId: { type: "string" },
        creditLedgerId: { type: "string" },
        totalAmount: { type: "number" },
        narration: { type: "string" },
      },
    }),
  },
  {
    toolName: "tally_inspect_aging_report",
    targetModule: "FINANCE_TALLY",
    description: "Fetch receivables and payables bill-by-bill aging details.",
    isMutative: false,
    requiresHitl: false,
    schemaInput: JSON.stringify({
      type: "object",
      properties: {},
    }),
  },
];

export async function ensureMcpSchema(tenantId: string = ACTIVE_TENANT_ID): Promise<void> {
  await runtimeDdl("table:mcp_schema_v3_migrations", async () => {
    // 1. Registered Tools Table & Columns
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS mcp_registered_tools (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        tool_name VARCHAR(100) NOT NULL,
        target_module VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        is_mutative BOOLEAN NOT NULL DEFAULT false,
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        execution_count INT NOT NULL DEFAULT 0,
        schema_input TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await prisma.$executeRaw`ALTER TABLE mcp_registered_tools ADD COLUMN IF NOT EXISTS is_mutative BOOLEAN NOT NULL DEFAULT false;`;
    await prisma.$executeRaw`ALTER TABLE mcp_registered_tools ADD COLUMN IF NOT EXISTS requires_hitl BOOLEAN NOT NULL DEFAULT false;`;
    await prisma.$executeRaw`ALTER TABLE mcp_registered_tools ADD COLUMN IF NOT EXISTS execution_count INT NOT NULL DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE mcp_registered_tools ADD COLUMN IF NOT EXISTS schema_input TEXT NOT NULL DEFAULT '{}';`;

    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'mcp_registered_tools_tool_name_key'
        ) THEN
          ALTER TABLE mcp_registered_tools DROP CONSTRAINT mcp_registered_tools_tool_name_key;
        END IF;
      END $$;
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_registered_tools_tenant_tool ON mcp_registered_tools (tenant_id, tool_name)
    `;

    // 2. Approvals Escrow Table & Columns
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
        rejection_reason TEXT,
        executed_at TIMESTAMPTZ,
        execution_result TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await prisma.$executeRaw`ALTER TABLE mcp_approvals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`;
    await prisma.$executeRaw`ALTER TABLE mcp_approvals ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;`;
    await prisma.$executeRaw`ALTER TABLE mcp_approvals ADD COLUMN IF NOT EXISTS execution_result TEXT;`;

    // 3. Agent Sessions Table & Columns
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

    await prisma.$executeRaw`ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS assigned_scope VARCHAR(100) NOT NULL DEFAULT 'CORE';`;
    await prisma.$executeRaw`ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS origin_ip VARCHAR(50) NOT NULL DEFAULT '127.0.0.1';`;
    await prisma.$executeRaw`ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS permission_level VARCHAR(50) NOT NULL DEFAULT 'READ_ONLY';`;
    await prisma.$executeRaw`ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW();`;
    await prisma.$executeRaw`ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS session_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';`;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_agent_sessions_tenant_agent ON mcp_agent_sessions (tenant_id, agent_title)
    `;

    // 4. Execution Logs Table & Columns
    await prisma.$executeRaw`
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
    `;

    await prisma.$executeRaw`ALTER TABLE mcp_execution_logs ADD COLUMN IF NOT EXISTS latency_ms INT NOT NULL DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE mcp_execution_logs ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS';`;
  });

  // Seed default tools for the active tenant if missing
  for (const tool of DEFAULT_MCP_TOOLS) {
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM mcp_registered_tools WHERE tenant_id = ${tenantId}::uuid AND tool_name = ${tool.toolName} LIMIT 1
    `;

    if (existing.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO mcp_registered_tools (
          tenant_id, tool_name, target_module, description, is_mutative, requires_hitl, execution_count, schema_input
        ) VALUES (
          ${tenantId}::uuid, ${tool.toolName}, ${tool.targetModule}, ${tool.description},
          ${tool.isMutative}, ${tool.requiresHitl}, 0, ${tool.schemaInput}
        )
      `;
    }
  }

  // Ensure default registered active AI agent sessions exist
  const defaultSessions = [
    {
      agentTitle: "Finance & Accounting Autonomous Agent",
      assignedScope: "FINANCE_AND_TALLY",
      originIp: "10.0.4.12 (Internal RPC)",
      permissionLevel: "MUTATIVE_HITL",
    },
    {
      agentTitle: "Procurement & Material Requisition Agent",
      assignedScope: "PROCUREMENT_SUPPLY_CHAIN",
      originIp: "10.0.4.15 (Internal RPC)",
      permissionLevel: "MUTATIVE_HITL",
    },
    {
      agentTitle: "CRM & Lead Pipeline Agent",
      assignedScope: "CRM_AND_SALES",
      originIp: "10.0.4.18 (Internal RPC)",
      permissionLevel: "READ_ONLY",
    },
    {
      agentTitle: "Site Safety & Construction DPR Agent",
      assignedScope: "CONSTRUCTION_OPERATIONS",
      originIp: "10.0.4.22 (Internal RPC)",
      permissionLevel: "READ_ONLY",
    },
  ];

  for (const s of defaultSessions) {
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM mcp_agent_sessions WHERE tenant_id = ${tenantId}::uuid AND agent_title = ${s.agentTitle} LIMIT 1
    `;

    if (existing.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO mcp_agent_sessions (
          tenant_id, agent_title, assigned_scope, origin_ip, permission_level, last_ping, session_status
        ) VALUES (
          ${tenantId}::uuid, ${s.agentTitle}, ${s.assignedScope}, ${s.originIp}, ${s.permissionLevel}, NOW(), 'ACTIVE'
        )
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE mcp_agent_sessions
        SET last_ping = NOW(), session_status = 'ACTIVE', origin_ip = ${s.originIp}
        WHERE tenant_id = ${tenantId}::uuid AND agent_title = ${s.agentTitle}
      `;
    }
  }
}
