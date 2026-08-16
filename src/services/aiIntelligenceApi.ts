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

export interface DocumentLegalDraft {
  id: string;
  documentTitle: string;
  documentType: "MOM Report" | "Legal Deed" | "Sale Agreement" | "Possession Affidavit";
  targetProjectOrBuyer: string;
  generationTimestamp: string;
  verificationStatus: "DRAFT" | "PENDING_APPROVAL" | "VERIFIED" | "REJECTED";
  requiresHitl: boolean;
  summaryText: string;
}

export interface SafetyConstructionInsight {
  id: string;
  cameraLocation: string;
  incidentType: "Missing Safety Helmet" | "Harness Violation" | "Labor Understaffing" | "Perimeter Breach";
  riskSeverity: "CRITICAL" | "HIGH" | "MODERATE";
  laborCount: number;
  projectedScheduleDelayDays: number;
  timestamp: string;
}

export interface FinanceProcurementInsight {
  id: string;
  itemName: string;
  suggestedVendorName: string;
  historicalQuoteAmount: number;
  recommendedAllocationAmount: number;
  savingsPercentage: number;
  cashBurnTrajectory: "STABLE" | "HIGH_BURN" | "OPTIMIZED";
}

export interface RiskMarketInsight {
  id: string;
  commodityName: "Structural Steel" | "Ready-Mix Cement" | "Coarse Aggregates";
  currentMarketIndexPrice: number;
  priceTrendRecommendation: "STRATEGIC_BUY" | "HOLD" | "MONITOR";
  fraudAnomalyScore: number;
  customerSentimentScore: number;
  signalAmount: number;
  requiresHitl: boolean;
  summary: string;
}

export interface AiIntelligenceApprovalItem {
  id: string;
  title: string;
  category: "LEGAL_DEED" | "FRAUD_ALERT" | "COMMODITY_BUY_SIGNAL";
  targetReference: string;
  targetId?: string | null;
  amount: number;
  justification: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  requiresHitl: boolean;
  rejectionReason?: string | null;
  approvedBy?: string | null;
  reviewedAt?: string | null;
}

const API_BASE = "/api/v1/ai-intelligence";

async function fetchEnvelope<T>(url: string, options?: RequestInit, allowNull: boolean = false): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    "X-Tenant-ID": ACTIVE_TENANT_ID,
    "X-Request-ID": `req-${Date.now()}`,
    ...(options?.headers || {}),
  };

  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers,
  });

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

export const aiIntelligenceApi = {
  async getDocumentsLegal(): Promise<DocumentLegalDraft[]> {
    return fetchEnvelope<DocumentLegalDraft[]>(`${API_BASE}/documents-legal`);
  },

  async generateDocument(payload: {
    documentTitle: string;
    documentType: "MOM Report" | "Legal Deed" | "Sale Agreement" | "Possession Affidavit";
    targetProjectOrBuyer: string;
    summaryText: string;
  }): Promise<DocumentLegalDraft> {
    return fetchEnvelope<DocumentLegalDraft>(`${API_BASE}/documents-legal`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getConstructionSafety(): Promise<SafetyConstructionInsight[]> {
    return fetchEnvelope<SafetyConstructionInsight[]>(`${API_BASE}/construction-safety`);
  },

  async createConstructionSafety(payload: {
    cameraLocation: string;
    incidentType: string;
    riskSeverity?: string;
    laborCount?: number;
    projectedScheduleDelayDays?: number;
  }): Promise<SafetyConstructionInsight> {
    return fetchEnvelope<SafetyConstructionInsight>(`${API_BASE}/construction-safety`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getFinanceProcurement(): Promise<FinanceProcurementInsight[]> {
    return fetchEnvelope<FinanceProcurementInsight[]>(`${API_BASE}/finance-procurement`);
  },

  async createFinanceProcurement(payload: {
    itemName: string;
    suggestedVendorName: string;
    historicalQuoteAmount?: number;
    recommendedAllocationAmount?: number;
    savingsPercentage?: number;
    cashBurnTrajectory?: string;
  }): Promise<FinanceProcurementInsight> {
    return fetchEnvelope<FinanceProcurementInsight>(`${API_BASE}/finance-procurement`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getRiskMarket(): Promise<RiskMarketInsight[]> {
    return fetchEnvelope<RiskMarketInsight[]>(`${API_BASE}/risk-market`);
  },

  async createRiskMarket(payload: {
    commodityName: string;
    currentMarketIndexPrice?: number;
    priceTrendRecommendation?: string;
    fraudAnomalyScore?: number;
    customerSentimentScore?: number;
    signalAmount?: number;
    requiresHitl?: boolean;
    summary: string;
  }): Promise<RiskMarketInsight> {
    return fetchEnvelope<RiskMarketInsight>(`${API_BASE}/risk-market`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPendingApprovals(): Promise<AiIntelligenceApprovalItem[]> {
    return fetchEnvelope<AiIntelligenceApprovalItem[]>(`${API_BASE}/approvals`);
  },

  async authorizeApproval(id: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/authorize`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },

  async rejectApproval(id: string, reason?: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/reject`, {
      method: "POST",
      body: JSON.stringify({ id, reason: reason || "Rejected by Governance Director" }),
    });
  },
};
