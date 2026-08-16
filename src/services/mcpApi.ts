import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export interface ApiResponseEnvelope<T> {
  success: boolean;
  status_code: number;
  timestamp: string;
  request_id: string;
  data: T | null;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
  meta?: {
    page?: number;
    limit?: number;
    total_records?: number;
  } | null;
}

export interface McpSystemOverview {
  protocolVersion: string;
  transportState: string;
  activeAgentsCount: number;
  registeredToolsCount: number;
  totalExecutions24h: number;
  pendingHitlRequestsCount: number;
}

export interface McpRegisteredTool {
  id: string;
  toolName: string;
  targetModule: string;
  description: string;
  isMutative: boolean;
  requiresHitl: boolean;
  executionCount: number;
  schemaInput: string;
}

export interface McpAgentSession {
  id: string;
  agentTitle: string;
  assignedScope: string;
  originIp: string;
  permissionLevel: "READ_ONLY" | "MUTATIVE_HITL" | "FULL_ADMIN";
  lastPing: string;
  sessionStatus: "ACTIVE" | "IDLE" | "SUSPENDED";
}

export interface McpExecutionLog {
  id: string;
  timestamp: string;
  agentTitle: string;
  invokedTool: string;
  parametersSummary: string;
  latencyMs: number;
  status: "SUCCESS" | "FAILED" | "HITL_INTERCEPTED";
}

export interface McpApprovalItem {
  id: string;
  agentTitle: string;
  invokedTool: string;
  targetModule: string;
  parametersSummary: string;
  justification: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  requiresHitl: boolean;
}

const API_BASE = "/api/v1/mcp";

async function fetchEnvelope<T>(url: string, options?: RequestInit, allowNull: boolean = false): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    "X-Tenant-ID": ACTIVE_TENANT_ID,
    "X-Request-ID": `req-${Date.now()}`,
    ...(options?.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const envelope: ApiResponseEnvelope<T> = await response.json();

  if (!envelope.success || envelope.error) {
    throw new Error(envelope.error?.message || `Request failed with status ${envelope.status_code}`);
  }

  if (envelope.data === null || envelope.data === undefined) {
    if (allowNull) return null as unknown as T;
    throw new Error("No record was returned");
  }

  return envelope.data;
}

export const mcpApi = {
  async getOverview(): Promise<McpSystemOverview> {
    const [tools, sessions, logs, approvals] = await Promise.allSettled([
      fetchEnvelope<McpRegisteredTool[]>(`${API_BASE}/tools`),
      fetchEnvelope<McpAgentSession[]>(`${API_BASE}/sessions`),
      fetchEnvelope<McpExecutionLog[]>(`${API_BASE}/logs`),
      fetchEnvelope<McpApprovalItem[]>(`${API_BASE}/approvals`),
    ]);

    const toolList = tools.status === "fulfilled" ? tools.value : [];
    const sessionList = sessions.status === "fulfilled" ? sessions.value : [];
    const logList = logs.status === "fulfilled" ? logs.value : [];
    const approvalList = approvals.status === "fulfilled" ? approvals.value : [];

    return {
      protocolVersion: "MCP v1.0 (JSON-RPC 2.0 / SSE)",
      transportState: "SERVER_SENT_EVENTS_OPERATIONAL",
      activeAgentsCount: sessionList.filter((s) => s.sessionStatus === "ACTIVE").length,
      registeredToolsCount: toolList.length,
      totalExecutions24h: logList.length,
      pendingHitlRequestsCount: approvalList.length,
    };
  },

  async getTools(): Promise<McpRegisteredTool[]> {
    return fetchEnvelope<McpRegisteredTool[]>(`${API_BASE}/tools`);
  },

  async registerTool(payload: {
    toolName: string;
    targetModule: string;
    description: string;
    isMutative?: boolean;
    requiresHitl?: boolean;
    schemaInput?: string | Record<string, unknown>;
  }): Promise<McpRegisteredTool> {
    return fetchEnvelope<McpRegisteredTool>(`${API_BASE}/tools`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getSessions(): Promise<McpAgentSession[]> {
    return fetchEnvelope<McpAgentSession[]>(`${API_BASE}/sessions`);
  },

  async getLogs(): Promise<McpExecutionLog[]> {
    return fetchEnvelope<McpExecutionLog[]>(`${API_BASE}/logs`);
  },

  async getPendingApprovals(): Promise<McpApprovalItem[]> {
    return fetchEnvelope<McpApprovalItem[]>(`${API_BASE}/approvals`);
  },

  async authorizeApproval(id: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/authorize`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },

  async rejectApproval(id: string, reason: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/reject`, {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    });
  },
};
