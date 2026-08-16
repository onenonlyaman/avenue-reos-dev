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

export interface WbsMilestone {
  id: string;
  milestoneCode: string;
  executionPhase: string;
  milestoneTitle: string;
  phaseWeightagePct: number;
  physicalCompletionPct: number;
  targetStartDate: string;
  targetCompletionDate: string;
  actualCompletionDate: string | null;
  assignedContractor: string;
  financialAllocationLakhs: number;
  status: "COMPLETED" | "IN_PROGRESS" | "DELAYED" | "PENDING";
  projectName: string;
  projectId: string;
}

export interface DailyProgressLog {
  id: string;
  reportDate: string;
  supervisingEngineer: string;
  skilledLaborCount: number;
  unskilledLaborCount: number;
  totalLaborCount: number;
  equipmentHours: number;
  cementBags: number;
  steelMt: number;
  concreteM3: number;
  workDetails: string;
  physicalProgressPct: number;
  projectName: string;
  projectId: string;
}

export interface ContractorRaBill {
  id: string;
  billReference: string;
  contractorName: string;
  wbsPhase: string;
  grossClaimLakhs: number;
  verifiedLakhs: number;
  retainedHoldbackLakhs: number;
  gstLakhs: number;
  netPayableLakhs: number;
  claimedProgressPct: number;
  verifiedProgressPct: number;
  requiresHitl: boolean;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  projectName: string;
  projectId: string;
}

export interface QualitySafetyInspection {
  id: string;
  inspectionDate: string;
  siteLocation: string;
  category: string;
  inspectingEngineer: string;
  status: "PASSED" | "VIOLATION_FLAGGED" | "RESOLVED";
  remarks?: string;
}

export interface CreateDprPayload {
  projectId: string;
  reportDate: string;
  supervisingEngineer: string;
  skilledLaborCount: number;
  unskilledLaborCount: number;
  equipmentHours: number;
  cementBags: number;
  steelMt: number;
  concreteM3: number;
  workDetails: string;
  physicalProgressPct: number;
}

export interface SubmitRaBillPayload {
  projectId: string;
  contractorName: string;
  wbsPhase: string;
  grossClaimLakhs: number;
  claimedProgressPct: number;
}

const API_BASE = "/api/v1/construction";

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

export const constructionApi = {
  async getWbsMilestones(projectId?: string): Promise<WbsMilestone[]> {
    const query = projectId && projectId !== "All" ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return fetchEnvelope<WbsMilestone[]>(`${API_BASE}/wbs${query}`);
  },

  async getDprLogs(projectId?: string, date?: string): Promise<DailyProgressLog[]> {
    const params = new URLSearchParams();
    if (projectId && projectId !== "All") params.append("projectId", projectId);
    if (date) params.append("date", date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchEnvelope<DailyProgressLog[]>(`${API_BASE}/dpr${query}`);
  },

  async createDprLog(payload: CreateDprPayload): Promise<DailyProgressLog> {
    return fetchEnvelope<DailyProgressLog>(`${API_BASE}/dpr`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getRaBills(projectId?: string): Promise<ContractorRaBill[]> {
    const query = projectId && projectId !== "All" ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return fetchEnvelope<ContractorRaBill[]>(`${API_BASE}/ra-bills${query}`);
  },

  async submitRaBill(payload: SubmitRaBillPayload): Promise<ContractorRaBill> {
    return fetchEnvelope<ContractorRaBill>(`${API_BASE}/ra-bills`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPendingApprovals(): Promise<ContractorRaBill[]> {
    return fetchEnvelope<ContractorRaBill[]>(`${API_BASE}/ra-bills/pending`);
  },

  async authorizeRaBill(id: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/ra-bills/authorize`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },

  async rejectRaBill(id: string, reason: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/ra-bills/reject`, {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    });
  },

  async getInspections(projectId?: string): Promise<QualitySafetyInspection[]> {
    const query = projectId && projectId !== "All" ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return fetchEnvelope<QualitySafetyInspection[]>(`${API_BASE}/inspections${query}`);
  },

  async getSites(projectId?: string): Promise<ConstructionSiteItem[]> {
    const query = projectId && projectId !== "All" ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return fetchEnvelope<ConstructionSiteItem[]>(`${API_BASE}/sites${query}`);
  },

  async createSite(payload: CreateSitePayload): Promise<ConstructionSiteItem> {
    return fetchEnvelope<ConstructionSiteItem>(`${API_BASE}/sites`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export interface ConstructionSiteItem {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  siteCode: string;
  siteName: string;
  gpsCoordinates: string;
  status: string;
  siteEngineerId: string;
  siteEngineerName: string;
  createdAt: string;
}

export interface CreateSitePayload {
  projectId?: string;
  siteCode?: string;
  siteName: string;
  gpsCoordinates?: string;
  siteEngineerId?: string;
  status?: string;
}
