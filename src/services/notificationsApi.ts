import { ApiResponseEnvelope } from "./authApi";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export interface SystemNotification {
  id: string;
  timestamp: string;
  src_module: string;
  user_type: string;
  type: "ALERT" | "APPROVAL_REQUEST" | "INFO" | "WORKFLOW_STEP" | "AI_AGENT_ACTION_REQUIRED";
  description: string;
  action_link: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  is_read: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

const API_BASE = "/api/v1/notifications";

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

  return envelope.data || ([] as unknown as T);
}

export const notificationsApi = {
  async getNotifications(): Promise<SystemNotification[]> {
    return fetchEnvelope<SystemNotification[]>(API_BASE);
  },

  async markAsRead(id: string): Promise<void> {
    await fetchEnvelope<{ id: string; is_read: boolean }>(API_BASE, {
      method: "PATCH",
      body: JSON.stringify({ id, is_read: true }),
    });
  },

  async markAllAsRead(): Promise<void> {
    await fetchEnvelope<{ success: boolean }>(API_BASE, {
      method: "POST",
      body: JSON.stringify({ action: "mark_all_read" }),
    });
  },
};
