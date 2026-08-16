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

export interface ConnectorStatus {
  id: string;
  connectorName: string;
  category: "Payment Gateway" | "ERP Sync" | "Communications" | "Hardware API" | "Compliance";
  status: "CONNECTED" | "DEGRADED" | "DISCONNECTED";
  lastSyncTime: string;
  syncedVouchers24h: number;
  unreconciledWebhooks: number;
}

export interface CommunicationsIntegration {
  id: string;
  serviceName: string;
  channelType: string;
  status: "CONNECTED" | "DEGRADED" | "DISCONNECTED";
  dispatched24h: number;
  lastWebhookTimestamp: string;
}

export interface HardwareWorkspaceIntegration {
  id: string;
  integrationName: string;
  category: string;
  status: "CONNECTED" | "DEGRADED" | "DISCONNECTED";
  syncedDocumentsOrLogs: number;
  lastSyncTimestamp: string;
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  providerName: string;
  endpoint: string;
  payloadType: string;
  responseStatus: "SUCCESS" | "FAILED" | "HITL_INTERCEPTED" | "INTERCEPTED";
  latencyMs: number;
}

export interface IntegrationsApprovalItem {
  id: string;
  connectorName: string;
  actionType: "LEDGER_SYNC" | "REFUND_TRIGGER" | "KEY_ROTATION" | string;
  syncAmount: number;
  justification: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  requiresHitl: boolean;
  createdAt?: string;
}

export interface ConnectorConfigPayload {
  connectorName: string;
  category: "Payment Gateway" | "ERP Sync" | "Communications" | "Hardware API" | "Compliance";
  status?: "CONNECTED" | "DEGRADED" | "DISCONNECTED";
  apiKey?: string;
  apiSecret?: string;
  endpointUrl?: string;
  environment?: "Production" | "Sandbox";
}

const API_BASE = "/api/v1/integrations";

async function fetchEnvelope<T>(url: string, options?: RequestInit, allowNull: boolean = false): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    "X-Tenant-ID": ACTIVE_TENANT_ID,
    "X-Request-ID": `req-${Date.now()}`,
    ...(options?.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  
  let envelope: ApiResponseEnvelope<T>;
  try {
    envelope = await response.json();
  } catch {
    throw new Error(`Integration service returned invalid response (Status ${response.status})`);
  }

  if (!envelope.success || envelope.error) {
    throw new Error(envelope.error?.message || `Request failed with status ${envelope.status_code}`);
  }

  if (envelope.data === null || envelope.data === undefined) {
    if (allowNull) return null as unknown as T;
    throw new Error("No record was returned");
  }

  return envelope.data;
}

export const integrationsApi = {
  async getConnectors(): Promise<ConnectorStatus[]> {
    return fetchEnvelope<ConnectorStatus[]>(`${API_BASE}/connectors`);
  },

  async updateConnectorConfig(payload: ConnectorConfigPayload): Promise<ConnectorStatus> {
    return fetchEnvelope<ConnectorStatus>(`${API_BASE}/connectors`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async triggerManualSync(connectorName: string, amount: number): Promise<{ success: boolean; requiresHitl: boolean; connectorName: string; amount: number }> {
    return fetchEnvelope<{ success: boolean; requiresHitl: boolean; connectorName: string; amount: number }>(`${API_BASE}/connectors`, {
      method: "POST",
      body: JSON.stringify({ action: "MANUAL_SYNC", connectorName, amount }),
    });
  },

  async getCommunicationsIntegrations(): Promise<CommunicationsIntegration[]> {
    return fetchEnvelope<CommunicationsIntegration[]>(`${API_BASE}/communications`);
  },

  async createCommunicationsIntegration(payload: {
    serviceName: string;
    channelType: string;
    status?: string;
    dispatched24h?: number;
  }): Promise<CommunicationsIntegration> {
    return fetchEnvelope<CommunicationsIntegration>(`${API_BASE}/communications`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getHardwareWorkspaceIntegrations(): Promise<HardwareWorkspaceIntegration[]> {
    return fetchEnvelope<HardwareWorkspaceIntegration[]>(`${API_BASE}/hardware`);
  },

  async createHardwareIntegration(payload: {
    integrationName: string;
    category: string;
    status?: string;
    syncedDocumentsOrLogs?: number;
  }): Promise<HardwareWorkspaceIntegration> {
    return fetchEnvelope<HardwareWorkspaceIntegration>(`${API_BASE}/hardware`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getLogs(): Promise<IntegrationLog[]> {
    return fetchEnvelope<IntegrationLog[]>(`${API_BASE}/logs`);
  },

  async getPendingApprovals(): Promise<IntegrationsApprovalItem[]> {
    return fetchEnvelope<IntegrationsApprovalItem[]>(`${API_BASE}/approvals`);
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
