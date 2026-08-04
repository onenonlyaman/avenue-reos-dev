import { UserProfile, ApiResponseEnvelope } from "./authApi";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export interface UserSessionDevice {
  id: string;
  deviceName: string;
  ipAddress: string;
  lastActiveTimestamp: string;
  isCurrentDevice: boolean;
}

export interface UserApprovalItem {
  id: string;
  targetUserName: string;
  requestedRole: string;
  requestedFinancialLimit: number;
  justification: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  requiresHitl: boolean;
}

const API_BASE = "/api/v1/users";

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

export const usersApi = {
  async getUsers(): Promise<UserProfile[]> {
    return fetchEnvelope<UserProfile[]>(`${API_BASE}`);
  },

  async inviteUser(payload: Partial<UserProfile>): Promise<UserProfile> {
    return fetchEnvelope<UserProfile>(`${API_BASE}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateRole(userName: string, targetRole: string, financialLimit?: number): Promise<{ success: boolean; requiresHitl: boolean }> {
    return fetchEnvelope<{ success: boolean; requiresHitl: boolean }>(`${API_BASE}/roles`, {
      method: "POST",
      body: JSON.stringify({ userName, targetRole, financialLimit }),
    });
  },

  async getActiveSessions(): Promise<UserSessionDevice[]> {
    return fetchEnvelope<UserSessionDevice[]>(`${API_BASE}/sessions`);
  },

  async revokeAllSessions(): Promise<{ success: boolean }> {
    return fetchEnvelope<{ success: boolean }>(`${API_BASE}/sessions`, {
      method: "DELETE",
    });
  },

  async getPendingApprovals(): Promise<UserApprovalItem[]> {
    return fetchEnvelope<UserApprovalItem[]>(`${API_BASE}/approvals`);
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
