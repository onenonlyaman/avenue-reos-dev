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

export interface TenantProfile {
  id: string;
  organizationLegalName: string;
  gstinRegistration: string;
  registeredAddress: string;
  operationalTimezone: string;
  baseCurrency: string;
  fiscalYearCycle: string;
  activeUsersCount: number;
  activeSiteAccountsCount: number;
}

export interface UserAccount {
  id: string;
  fullName: string;
  corporateEmail: string;
  assignedRole: string;
  department: string;
  accountStatus: "ACTIVE" | "SUSPENDED" | "PENDING_PROVISION";
  lastActiveDate: string;
}

export interface SystemRolePermission {
  roleName: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAuthorizeHitl: boolean;
}

export interface AuditTrailLog {
  id: string;
  timestamp: string;
  officerName: string;
  moduleExecuted: string;
  actionType: "Create" | "Update" | "Financial Approval" | "HITL Override";
  targetDescription: string;
  ipAddress: string;
  securityVerified: boolean;
}

export interface SecurityPolicy {
  id: string;
  mfaEnforced: boolean;
  whitelistedIpRanges: string[];
  sessionTimeoutMinutes: number;
  passwordRotationDays: number;
  superAdminElevationHitl: boolean;
}

export interface SecurityOverrideRequest {
  id: string;
  requestReference: string;
  requestingAdminName: string;
  modificationType: string;
  targetUserOrPolicy: string;
  justification: string;
  requiresHitl: boolean;
  status: "PENDING_GOVERNANCE_APPROVAL" | "APPROVED" | "REJECTED";
}

export interface ProvisionUserPayload {
  fullName: string;
  corporateEmail: string;
  assignedRole: string;
  department: string;
}

export interface UpdateSecurityPolicyPayload {
  mfaEnforced: boolean;
  whitelistedIpRanges: string[];
  sessionTimeoutMinutes: number;
  passwordRotationDays: number;
}

const API_BASE = "/api/v1/settings";

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

export const settingsApi = {
  async getTenantProfile(): Promise<TenantProfile | null> {
    return fetchEnvelope<TenantProfile | null>(`${API_BASE}/tenant`, undefined, true);
  },

  async updateTenantProfile(payload: Partial<TenantProfile>): Promise<TenantProfile> {
    return fetchEnvelope<TenantProfile>(`${API_BASE}/tenant`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getUsers(): Promise<UserAccount[]> {
    return fetchEnvelope<UserAccount[]>(`${API_BASE}/users`);
  },

  async provisionUser(payload: ProvisionUserPayload): Promise<UserAccount> {
    return fetchEnvelope<UserAccount>(`${API_BASE}/users`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getRolePermissions(): Promise<SystemRolePermission[]> {
    return fetchEnvelope<SystemRolePermission[]>(`${API_BASE}/roles`);
  },

  async updateRolePermission(permission: SystemRolePermission): Promise<SystemRolePermission> {
    return fetchEnvelope<SystemRolePermission>(`${API_BASE}/roles`, {
      method: "POST",
      body: JSON.stringify(permission),
    });
  },

  async getAuditLogs(): Promise<AuditTrailLog[]> {
    return fetchEnvelope<AuditTrailLog[]>(`${API_BASE}/audit-logs`);
  },

  async getSecurityPolicy(): Promise<SecurityPolicy | null> {
    return fetchEnvelope<SecurityPolicy | null>(`${API_BASE}/security`, undefined, true);
  },

  async updateSecurityPolicy(payload: UpdateSecurityPolicyPayload): Promise<SecurityPolicy> {
    return fetchEnvelope<SecurityPolicy>(`${API_BASE}/security`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPendingApprovals(): Promise<SecurityOverrideRequest[]> {
    return fetchEnvelope<SecurityOverrideRequest[]>(`${API_BASE}/approvals`);
  },

  async authorizeSecurityOverride(id: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/authorize`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },

  async rejectSecurityOverride(id: string, reason: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/reject`, {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    });
  },
};
