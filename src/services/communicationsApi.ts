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

export interface ChatChannel {
  id: string;
  channelName: string;
  department: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  lastActivity: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
  isPinned: boolean;
  actionLinkUrl?: string;
  actionLinkLabel?: string;
}

export interface SupportTicket {
  id: string;
  ticketReference: string;
  customerName: string;
  subject: string;
  category: "Possession Handover" | "Billing Dispute" | "Construction Quality" | "Legal Notice" | "General Inquiry";
  assignedDepartment: string;
  priority: "CRITICAL" | "HIGH" | "STANDARD";
  slaStatus: "ON_TRACK" | "AT_RISK" | "BREACHED";
  status: "OPEN" | "IN_PROGRESS" | "PENDING_APPROVAL" | "RESOLVED";
  claimAmount: number;
  requiresHitl: boolean;
  createdAt: string;
}

export interface CustomerTimelineEntry {
  id: string;
  customerName: string;
  unitNumber: string;
  interactionType: "Call Log" | "Chat Message" | "Support Ticket" | "Legal Escalation";
  summary: string;
  officerName: string;
  timestamp: string;
}

export interface CommunicationsApprovalItem {
  id: string;
  ticketReference: string;
  customerName: string;
  issueSummary: string;
  claimAmount: number;
  justification: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  requiresHitl: boolean;
}

const API_BASE = "/api/v1/communications";

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

export const communicationsApi = {
  async getChannels(): Promise<ChatChannel[]> {
    return fetchEnvelope<ChatChannel[]>(`${API_BASE}/channels`);
  },

  async createChannel(payload: Partial<ChatChannel>): Promise<ChatChannel> {
    return fetchEnvelope<ChatChannel>(`${API_BASE}/channels`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getMessages(channelId: string): Promise<ChatMessage[]> {
    return fetchEnvelope<ChatMessage[]>(`${API_BASE}/messages?channelId=${channelId}`);
  },

  async sendMessage(payload: Partial<ChatMessage>): Promise<ChatMessage> {
    return fetchEnvelope<ChatMessage>(`${API_BASE}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getTickets(): Promise<SupportTicket[]> {
    return fetchEnvelope<SupportTicket[]>(`${API_BASE}/tickets`);
  },

  async createTicket(payload: Partial<SupportTicket>): Promise<SupportTicket> {
    return fetchEnvelope<SupportTicket>(`${API_BASE}/tickets`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCustomerTimeline(): Promise<CustomerTimelineEntry[]> {
    return fetchEnvelope<CustomerTimelineEntry[]>(`${API_BASE}/customer-timeline`);
  },

  async getPendingApprovals(): Promise<CommunicationsApprovalItem[]> {
    return fetchEnvelope<CommunicationsApprovalItem[]>(`${API_BASE}/approvals`);
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
