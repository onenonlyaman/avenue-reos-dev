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

export interface CatalogEntry {
  id: string;
  category: string;
  optionValue: string;
  sortOrder: number;
}

export interface ProvisionUserPayload {
  fullName: string;
  corporateEmail: string;
  assignedRole: string;
  department: string;
  initialPassword: string;
}

export interface UpdateSecurityPolicyPayload {
  mfaEnforced: boolean;
  whitelistedIpRanges: string[];
  sessionTimeoutMinutes: number;
  passwordRotationDays: number;
}

export interface AuditLogsResponse {
  logs: AuditTrailLog[];
  totalRecords: number;
  page: number;
  limit: number;
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

  async getAuditLogs(params?: { page?: number; limit?: number; actionType?: string; search?: string }): Promise<AuditLogsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.actionType && params.actionType !== "ALL") searchParams.set("actionType", params.actionType);
    if (params?.search) searchParams.set("search", params.search);

    const qs = searchParams.toString();
    const url = `${API_BASE}/audit-logs${qs ? `?${qs}` : ""}`;

    const headers = {
      "Content-Type": "application/json",
      "X-Tenant-ID": ACTIVE_TENANT_ID,
      "X-Request-ID": `req-${Date.now()}`,
    };

    const response = await fetch(url, { headers });
    const envelope: ApiResponseEnvelope<AuditTrailLog[]> = await response.json();

    if (!envelope.success || envelope.error) {
      throw new Error(envelope.error?.message || `Request failed with status ${envelope.status_code}`);
    }

    return {
      logs: envelope.data || [],
      totalRecords: envelope.meta?.total_records ?? (envelope.data ? envelope.data.length : 0),
      page: envelope.meta?.page ?? (params?.page || 1),
      limit: envelope.meta?.limit ?? (params?.limit || 20),
    };
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

  async createSecurityOverrideRequest(payload: {
    requestingAdminName?: string;
    modificationType: string;
    targetUserOrPolicy: string;
    justification: string;
  }): Promise<SecurityOverrideRequest> {
    return fetchEnvelope<SecurityOverrideRequest>(`${API_BASE}/approvals`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
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

  async getCatalog(category?: string): Promise<CatalogEntry[]> {
    const url = category ? `${API_BASE}/catalog?category=${encodeURIComponent(category)}` : `${API_BASE}/catalog`;
    return fetchEnvelope<CatalogEntry[]>(url);
  },

  async addCatalogEntry(entry: { category: string; optionValue: string; sortOrder?: number }): Promise<CatalogEntry> {
    return fetchEnvelope<CatalogEntry>(`${API_BASE}/catalog`, {
      method: "POST",
      body: JSON.stringify(entry),
    });
  },

  async syncCatalog(): Promise<{ importedCount: number }> {
    return fetchEnvelope<{ importedCount: number }>(`${API_BASE}/catalog/sync`, {
      method: "POST",
    });
  },

  async deleteCatalogEntry(id: string): Promise<{ id: string }> {
    const headers = {
      "Content-Type": "application/json",
      "X-Tenant-ID": ACTIVE_TENANT_ID,
      "X-Request-ID": `req-${Date.now()}`,
    };
    const res = await fetch(`${API_BASE}/catalog?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
    const envelope: ApiResponseEnvelope<{ id: string }> = await res.json();
    if (!envelope.success || envelope.error) {
      throw new Error(envelope.error?.message || "Catalog entry could not be removed");
    }
    return envelope.data || { id };
  },
};
