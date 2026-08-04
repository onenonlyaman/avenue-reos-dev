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

export interface UnitHandover {
  id: string;
  handoverReference: string;
  unitName: string;
  buyerName: string;
  desnaggingCompletionPct: number;
  financialNocCleared: boolean;
  outstandingBalance: number;
  targetHandoverDate: string;
  requiresHitl: boolean;
  status: "READY_FOR_HANDOVER" | "IN_DESNAGGING" | "HANDED_OVER" | "PENDING_APPROVAL";
}

export interface CamInvoice {
  id: string;
  invoiceReference: string;
  unitName: string;
  superBuiltupSqft: number;
  billingPeriod: string;
  baseCamAmount: number;
  gstAmount: number;
  totalDueAmount: number;
  paymentStatus: "PAID" | "UNPAID" | "OVERDUE";
  issuedDate: string;
}

export interface MaintenanceTicket {
  id: string;
  ticketReference: string;
  ticketSummary: string;
  propertyLocation: string;
  category: "Electrical" | "Plumbing" | "Elevator" | "Civil" | "HVAC";
  priority: "Critical" | "Moderate" | "Low";
  slaStatus: "Within SLA" | "SLA Warning" | "SLA Breach";
  assignedContractor: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED";
  loggedDate: string;
}

export interface FacilityAsset {
  id: string;
  assetDescription: string;
  locationName: string;
  category: string;
  amcProviderName: string;
  warrantyExpiryDate: string;
  lastServiceDate: string;
  operatingStatus: "OPERATIONAL" | "NEEDS_SERVICE" | "DOWN";
  maintenanceCost: number;
}

export interface ScheduleHandoverPayload {
  unitName: string;
  buyerName: string;
  targetHandoverDate: string;
  desnaggingCompletionPct: number;
  outstandingBalance: number;
}

export interface GenerateCamInvoicesPayload {
  billingPeriod: string;
  ratePerSqft: number;
}

const API_BASE = "/api/v1/facility";

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

export const facilityApi = {
  async getHandovers(): Promise<UnitHandover[]> {
    return fetchEnvelope<UnitHandover[]>(`${API_BASE}/handovers`);
  },

  async scheduleHandover(payload: ScheduleHandoverPayload): Promise<UnitHandover> {
    return fetchEnvelope<UnitHandover>(`${API_BASE}/handovers`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCamInvoices(): Promise<CamInvoice[]> {
    return fetchEnvelope<CamInvoice[]>(`${API_BASE}/cam-invoices`);
  },

  async generateCamInvoices(payload: GenerateCamInvoicesPayload): Promise<{ success: boolean; generatedCount: number }> {
    return fetchEnvelope<{ success: boolean; generatedCount: number }>(`${API_BASE}/cam-invoices`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getTickets(): Promise<MaintenanceTicket[]> {
    return fetchEnvelope<MaintenanceTicket[]>(`${API_BASE}/tickets`);
  },

  async getAssets(): Promise<FacilityAsset[]> {
    return fetchEnvelope<FacilityAsset[]>(`${API_BASE}/assets`);
  },

  async getPendingApprovals(): Promise<UnitHandover[]> {
    return fetchEnvelope<UnitHandover[]>(`${API_BASE}/approvals`);
  },

  async authorizeHandover(id: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/authorize`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },

  async rejectHandover(id: string, reason: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/reject`, {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    });
  },
};
