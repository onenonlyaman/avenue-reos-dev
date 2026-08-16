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

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  department: string;
  designation: string;
  siteLocation: string;
  mfaEnabled: boolean;
  status: "ACTIVE" | "PENDING_APPROVAL" | "SUSPENDED";
  role: string;
  lastActive: string;
}

export interface AuthResponse {
  user: UserProfile;
  sessionToken?: string;
}

const API_BASE = "/api/v1/auth";

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

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return fetchEnvelope<AuthResponse>(`${API_BASE}/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async register(payload: {
    fullName: string;
    email: string;
    password: string;
    department: string;
    designation: string;
  }): Promise<{ submitted: boolean; message: string }> {
    return fetchEnvelope<{ submitted: boolean; message: string }>(`${API_BASE}/register`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getMe(): Promise<UserProfile> {
    return fetchEnvelope<UserProfile>(`${API_BASE}/me`);
  },

  async logout(): Promise<{ success: boolean }> {
    return fetchEnvelope<{ success: boolean }>(`${API_BASE}/logout`, {
      method: "POST",
    });
  },

  async requestPasswordReset(email: string): Promise<{ submitted: boolean; message: string }> {
    return fetchEnvelope<{ submitted: boolean; message: string }>(`${API_BASE}/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, password: string): Promise<{ updated: boolean; message: string }> {
    return fetchEnvelope<{ updated: boolean; message: string }>(`${API_BASE}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return fetchEnvelope<{ success: boolean; message: string }>(`${API_BASE}/change-password`, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};
