import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { ApiResponseEnvelope } from "./authApi";

export interface BookingTrendPoint {
  period: string;
  bookings: number;
  bookedValueCr: number;
}

export interface InventoryMixSlice {
  status: string;
  count: number;
}

export interface SalesFunnelStage {
  stage: string;
  count: number;
}

export interface AuthorizationQueue {
  label: string;
  pendingCount: number;
}

export interface PortfolioProject {
  projectName: string;
  location: string;
  totalUnits: number;
  bookedUnits: number;
  realizationPct: number;
  sanctionedBudgetCr: number;
  targetCompletion: string;
}

export interface BudgetUtilisationRow {
  costCentre: string;
  allocatedLakhs: number;
  committedLakhs: number;
  spentLakhs: number;
  utilisationPct: number;
}

export interface ContractorClaimGroup {
  status: string;
  count: number;
  valueCr: number;
}

export interface SupportTicketGroup {
  status: string;
  count: number;
}

export interface RecentRecord {
  label: string;
  detail: string;
  category: string;
  occurredAt: string;
}

export interface DashboardSummary {
  salesPipelineDemand: number;
  qualifiedLeadsCount: number;
  inventoryRealizationPct: number;
  totalRegisteredUnits: number;
  bookedUnits: number;
  committedLiabilities: number;
  activeCostCenterPOs: number;
  pendingHitlApprovals: number;
  activeDepartmentsCount: number;
  registeredCustomers: number;
  activeWorkforce: number;
  activeDevelopments: number;
  contractorClaimsPendingCr: number;
  bookingTrend: BookingTrendPoint[];
  inventoryMix: InventoryMixSlice[];
  salesFunnel: SalesFunnelStage[];
  authorizationQueues: AuthorizationQueue[];
  projectPortfolio: PortfolioProject[];
  budgetUtilisation: BudgetUtilisationRow[];
  contractorClaims: ContractorClaimGroup[];
  supportTickets: SupportTicketGroup[];
  recentRecords: RecentRecord[];
}

const API_BASE = "/api/v1/dashboard";

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
    throw new Error(envelope.error?.message || "Operating console figures could not be loaded");
  }

  if (envelope.data === null || envelope.data === undefined) {
    throw new Error("No record was returned");
  }

  return envelope.data;
}

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    return fetchEnvelope<DashboardSummary>(`${API_BASE}/summary`);
  },
};
