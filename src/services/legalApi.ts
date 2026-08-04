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

export interface LandParcel {
  id: string;
  parcelReference: string;
  parcelDescription: string;
  locationZone: string;
  plotAreaAcres: number;
  plotAreaSqft: number;
  applicableFsi: number;
  constructibleSqft: number;
  baseLandValueAmount: number;
  stampDutyAmount: number;
  registrationAmount: number;
  totalOutlayLakhs: number;
  titleStatus: "Clear Title" | "Title Under Verification" | "Litigated / Encumbered";
  acquisitionPhase: "SOURCING" | "FEASIBILITY" | "DUE_DILIGENCE" | "ACQUIRED" | "REJECTED";
  requiresHitl: boolean;
}

export interface JdaContract {
  id: string;
  agreementReference: string;
  landownerName: string;
  projectSite: string;
  developerSharePct: number;
  landownerSharePct: number;
  escrowAccountStatus: "ACTIVE" | "PENDING_SETUP" | "FROZEN";
  contractStatus: "ACTIVE" | "DRAFT" | "TERMINATED";
}

export interface ReraCompliance {
  id: string;
  projectName: string;
  reraRegReference: string;
  quarterlyReturnStatus: "COMPLIANT" | "PENDING_FILING" | "OVERDUE";
  escrowBalanceLakhs: number;
  form1Status: boolean;
  form2Status: boolean;
  form3Status: boolean;
  certificateAuditStatus: "Compliant" | "Pending Certification" | "Overdue Filing";
}

export interface TitleSearchLog {
  id: string;
  surveyNumber: string;
  legalAdvocate: string;
  searchPeriodYears: number;
  encumbranceStatus: "Clear" | "Mortgage Registered" | "Disputed";
  extractVerified712: boolean;
  riskRating: "LOW" | "MEDIUM" | "HIGH";
}

export interface AcquireLandPayload {
  parcelDescription: string;
  locationZone: string;
  plotAreaAcres: number;
  applicableFsi: number;
  baseLandValueAmount: number;
  titleStatus: "Clear Title" | "Title Under Verification" | "Litigated / Encumbered";
}

export interface DraftJdaPayload {
  landownerName: string;
  projectSite: string;
  developerSharePct: number;
  landownerSharePct: number;
}

const API_BASE = "/api/v1/legal";

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

export const legalApi = {
  async getParcels(): Promise<LandParcel[]> {
    return fetchEnvelope<LandParcel[]>(`${API_BASE}/parcels`);
  },

  async acquireLand(payload: AcquireLandPayload): Promise<LandParcel> {
    return fetchEnvelope<LandParcel>(`${API_BASE}/parcels`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getJdas(): Promise<JdaContract[]> {
    return fetchEnvelope<JdaContract[]>(`${API_BASE}/jdas`);
  },

  async draftJda(payload: DraftJdaPayload): Promise<JdaContract> {
    return fetchEnvelope<JdaContract>(`${API_BASE}/jdas`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getReraRecords(): Promise<ReraCompliance[]> {
    return fetchEnvelope<ReraCompliance[]>(`${API_BASE}/rera`);
  },

  async getTitleSearches(): Promise<TitleSearchLog[]> {
    return fetchEnvelope<TitleSearchLog[]>(`${API_BASE}/title-searches`);
  },

  async getPendingApprovals(): Promise<LandParcel[]> {
    return fetchEnvelope<LandParcel[]>(`${API_BASE}/approvals`);
  },

  async authorizeAcquisition(id: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/authorize`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },

  async rejectAcquisition(id: string, reason: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/reject`, {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    });
  },
};
