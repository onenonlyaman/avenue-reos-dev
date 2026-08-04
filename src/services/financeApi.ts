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

export interface FinancialOverviewData {
  cashInEscrowCr: number;
  operationalCashCr: number;
  accountsReceivableCr: number;
  accountsPayableCr: number;
  ytdProfitMarginPct: number;
  quarterlyBudgetAllocatedCr: number;
  quarterlyBudgetCommittedCr: number;
  quarterlyBudgetDisbursedCr: number;
}

export interface LedgerEntry {
  id: string;
  postingDate: string;
  entryNumber: string;
  accountHead: string;
  costCenter: string;
  debitAmount: number;
  creditAmount: number;
  postedBy: string;
  approvalStatus: "POSTED" | "PENDING_HITL" | "REJECTED";
  documentRef: string;
}

export interface CostCenterBudget {
  id: string;
  costCenterCode: string;
  projectName: string;
  category: string;
  totalBudgetLakhs: number;
  committedPoLakhs: number;
  actualDisbursedLakhs: number;
  variancePercentage: number;
  status: "NORMAL" | "WARNING" | "OVERRUN";
}

export interface PendingDisbursement {
  id: string;
  requestNumber: string;
  vendorOrRecipient: string;
  costCenter: string;
  projectName: string;
  amountLakhs: number;
  requestedBy: string;
  authorizingOfficer: string;
  requestDate: string;
  reason: "Manual GL Entry > ₹40L" | "High-Value Vendor PO" | "Budget Overrun Exception";
  documentRef: string;
  requiresHitl: boolean;
}

export interface JournalPostingPayload {
  postingDate: string;
  accountHead: string;
  costCenter: string;
  debitAmount: number;
  creditAmount: number;
  documentRef: string;
  notes?: string;
}

export interface BudgetAllocationPayload {
  budgetCode: string;
  costCenterId: string;
  totalBudgetLakhs: number;
  fiscalYear?: string;
}

const API_BASE = "/api/v1/finance";

async function fetchEnvelope<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    "X-Tenant-ID": "tenant-avenue-corp",
    "X-Project-ID": "proj-nashik-master",
    "X-Client-Type": "WEB_APP",
    "X-Request-ID": `req-${Date.now()}`,
    ...(options?.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const envelope: ApiResponseEnvelope<T> = await response.json();

  if (!envelope.success || envelope.error) {
    throw new Error(envelope.error?.message || `HTTP request failed with status ${envelope.status_code}`);
  }

  if (envelope.data === null || envelope.data === undefined) {
    throw new Error("No record was returned");
  }

  return envelope.data;
}

export const financeApi = {
  async getOverview(): Promise<FinancialOverviewData> {
    return fetchEnvelope<FinancialOverviewData>(`${API_BASE}/overview`);
  },

  async getLedgerEntries(params?: {
    search?: string;
    costCenter?: string;
    fiscalYear?: string;
  }): Promise<LedgerEntry[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.costCenter && params.costCenter !== "All") query.append("costCenter", params.costCenter);
    if (params?.fiscalYear) query.append("fiscalYear", params.fiscalYear);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return fetchEnvelope<LedgerEntry[]>(`${API_BASE}/ledger${queryString}`);
  },

  async postJournalEntry(payload: JournalPostingPayload): Promise<{ entry: LedgerEntry; requiresHitl: boolean }> {
    return fetchEnvelope<{ entry: LedgerEntry; requiresHitl: boolean }>(`${API_BASE}/journal-entry`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getBudgets(): Promise<CostCenterBudget[]> {
    return fetchEnvelope<CostCenterBudget[]>(`${API_BASE}/budgets`);
  },

  async createBudgetAllocation(payload: BudgetAllocationPayload): Promise<CostCenterBudget> {
    return fetchEnvelope<CostCenterBudget>(`${API_BASE}/budgets`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPendingApprovals(): Promise<PendingDisbursement[]> {
    return fetchEnvelope<PendingDisbursement[]>(`${API_BASE}/approvals`);
  },

  async authorizeDisbursement(id: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/authorize`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },

  async rejectDisbursement(id: string, reason: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/reject`, {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    });
  },
};
