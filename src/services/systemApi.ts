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

export interface SystemStatus {
  databaseStatus: "CONNECTED" | "DEGRADED" | "DISCONNECTED";
  databaseLatencyMs: number;
  eventStreamStatus: "OPERATIONAL" | "DEGRADED" | "UNKNOWN";
  eventStreamFailuresLastHour: number | null;
  activeSessionCount: number | null;
  lastVerifiedUtc: string;
}

export interface DbHealthReport {
  tenantIsolationEnforced: boolean;
  registersWithoutTenantScope: string[];
  totalTableCount: number;
  connectionPoolActive: number;
  connectionPoolMax: number;
  appliedMigrations: string[];
  appliedMigrationCount: number;
  avgQueryResponseTimeMs: number;
}

export interface HitlGateSummary {
  financePendingCount: number;
  constructionPendingCount: number;
  procurementPendingCount: number;
  facilityPendingCount: number;
  legalPendingCount: number;
  boardPendingCount: number;
  totalPendingHitl: number;
}

export interface EventStreamLog {
  id: string;
  eventName: string;
  originModule: string;
  targetModule: string;
  payloadSummary: string;
  timestamp: string;
  status: "DELIVERED" | "PROCESSING" | "FAILED";
}

const API_BASE = "/api/v1/system";

async function fetchEnvelope<T>(url: string, options?: RequestInit): Promise<T> {
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
    throw new Error("No record was returned");
  }

  return envelope.data;
}

export const systemApi = {
  async getEventStreamLogs(): Promise<EventStreamLog[]> {
    return fetchEnvelope<EventStreamLog[]>(`${API_BASE}/event-stream`);
  },

  async getSystemStatus(): Promise<SystemStatus> {
    return fetchEnvelope<SystemStatus>(`${API_BASE}/status`);
  },

  async getDbHealth(): Promise<DbHealthReport> {
    return fetchEnvelope<DbHealthReport>(`${API_BASE}/db-health`);
  },

  async getHitlSummary(): Promise<HitlGateSummary> {
    return fetchEnvelope<HitlGateSummary>(`${API_BASE}/hitl-summary`);
  },
};
