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

export interface PortfolioValuation {
  id: string;
  projectName: string;
  developmentType: string;
  totalSaleableAreaSqft: number;
  avgRealizedRatePerSqft: number;
  grossDevelopmentValueCr: number;
  netAssetValueCr: number;
  status: "ACTIVE" | "COMPLETED" | "PIPELINE";
}

export interface LiquidityEntry {
  id: string;
  operatingPeriod: string;
  customerInflowsLakhs: number;
  vendorOutflowsLakhs: number;
  debtServiceLakhs: number;
  netOperatingCashflowLakhs: number;
  dscrRatio: number;
  solvencyStatus: "Healthy Solvency" | "Debt Caution" | "Liquidity Risk";
}

export interface ProjectIrr {
  id: string;
  projectName: string;
  investedEquityCr: number;
  realizedCollectionsCr: number;
  projectedNetMarginPct: number;
  internalRateOfReturnPct: number;
  performanceBadge: "OUTPERFORMING" | "ON_TARGET" | "UNDERPERFORMING";
}

export interface EnterpriseRisk {
  id: string;
  riskCategory: string;
  associatedProjectSite: string;
  riskVectorSummary: string;
  impactRating: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  mitigationActionPlan: string;
  riskLevel: "Low" | "Medium" | "High / Critical";
  requiresHitl: boolean;
}

export interface CapitalAllocationRequest {
  id: string;
  requestReference: string;
  projectName: string;
  requestedCapitalLakhs: number;
  allocationPurpose: string;
  riskRating: "Low" | "Medium" | "High / Critical";
  requiresHitl: boolean;
  status: "PENDING_BOARD_APPROVAL" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface SimulateCashflowPayload {
  operatingPeriod: string;
  customerInflowsLakhs: number;
  vendorOutflowsLakhs: number;
  debtServiceLakhs: number;
}

const API_BASE = "/api/v1/analytics";

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

export const analyticsApi = {
  async getValuations(): Promise<PortfolioValuation[]> {
    return fetchEnvelope<PortfolioValuation[]>(`${API_BASE}/valuation`);
  },

  async getLiquidity(): Promise<LiquidityEntry[]> {
    return fetchEnvelope<LiquidityEntry[]>(`${API_BASE}/liquidity`);
  },

  async simulateCashflow(payload: SimulateCashflowPayload): Promise<LiquidityEntry> {
    return fetchEnvelope<LiquidityEntry>(`${API_BASE}/liquidity`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getIrrRecords(): Promise<ProjectIrr[]> {
    return fetchEnvelope<ProjectIrr[]>(`${API_BASE}/irr`);
  },

  async getRiskMatrix(): Promise<EnterpriseRisk[]> {
    return fetchEnvelope<EnterpriseRisk[]>(`${API_BASE}/risk`);
  },

  async createEnterpriseRisk(payload: {
    riskCategory: string;
    associatedProjectSite: string;
    riskVectorSummary: string;
    impactRating?: string;
    mitigationActionPlan: string;
    riskLevel?: string;
    requiresHitl?: boolean;
  }): Promise<EnterpriseRisk> {
    return fetchEnvelope<EnterpriseRisk>(`${API_BASE}/risk`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPendingApprovals(): Promise<CapitalAllocationRequest[]> {
    return fetchEnvelope<CapitalAllocationRequest[]>(`${API_BASE}/approvals`);
  },

  async createCapitalAllocationRequest(payload: {
    projectName: string;
    requestedCapitalLakhs: number;
    allocationPurpose: string;
    riskRating?: string;
  }): Promise<CapitalAllocationRequest> {
    return fetchEnvelope<CapitalAllocationRequest>(`${API_BASE}/approvals`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async authorizeCapitalAllocation(id: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/authorize`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },

  async rejectCapitalAllocation(id: string, reason: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/reject`, {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    });
  },
};
