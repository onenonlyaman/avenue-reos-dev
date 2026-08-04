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

export interface Employee {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  siteLocation: string;
  workforceType: "Permanent" | "Contract" | "Daily Wage";
  status: "ACTIVE" | "ON_LEAVE" | "NOTICE_PERIOD" | "TERMINATED";
  joiningDate: string;
  corporateEmail: string;
  contactNumber: string;
}

export interface AttendanceRecord {
  id: string;
  employeeName: string;
  siteLocation: string;
  checkInTime: string;
  checkOutTime: string;
  deviceStatus: "SYNCED" | "OFFLINE_QUEUED" | "MANUAL_ENTRY";
  overtimeHours: number;
  status: "PRESENT" | "LATE" | "ABSENT" | "HALF_DAY" | "ON_LEAVE";
}

export interface PayrollRun {
  id: string;
  cycleMonth: string;
  totalGrossSalary: number;
  totalPfDeduction: number;
  totalEsicDeduction: number;
  totalPtDeduction: number;
  approvedExpenses: number;
  netPayable: number;
  status: "DRAFT" | "PENDING_APPROVAL" | "DISBURSED" | "REJECTED";
  requiresHitl: boolean;
  employeeCount: number;
}

export interface Candidate {
  id: string;
  candidateName: string;
  targetPosition: string;
  experienceLevel: string;
  currentStage: "Applied" | "Screening" | "Technical Interview" | "Site Assessment" | "Offer Issued" | "Hired" | "Rejected";
  interviewScore: number;
  contactEmail: string;
}

export interface PerformanceGoal {
  id: string;
  employeeName: string;
  isTrainee: boolean;
  department: string;
  title: string;
  targetScore: number;
  achievedScore: number;
  status: "ON_TRACK" | "AT_RISK" | "NEEDS_IMPROVEMENT" | "COMPLETED";
}

export interface HrApprovalItem {
  id: string;
  type: "PAYROLL_RUN" | "EXIT_SETTLEMENT";
  referenceName: string;
  amount: number;
  justification: string;
  requestedBy: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  requiresHitl: boolean;
}

const API_BASE = "/api/v1/hr";

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

export const hrApi = {
  async getEmployees(): Promise<Employee[]> {
    return fetchEnvelope<Employee[]>(`${API_BASE}/employees`);
  },

  async addEmployee(payload: Partial<Employee>): Promise<Employee> {
    return fetchEnvelope<Employee>(`${API_BASE}/employees`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getAttendance(): Promise<AttendanceRecord[]> {
    return fetchEnvelope<AttendanceRecord[]>(`${API_BASE}/attendance`);
  },

  async syncBiometrics(): Promise<{ success: boolean; syncedCount: number }> {
    return fetchEnvelope<{ success: boolean; syncedCount: number }>(`${API_BASE}/attendance`, {
      method: "POST",
      body: JSON.stringify({ action: "SYNC_BIOMETRICS" }),
    });
  },

  async getPayroll(): Promise<PayrollRun | null> {
    return fetchEnvelope<PayrollRun | null>(`${API_BASE}/payroll`, undefined, true);
  },

  async processPayrollRun(payload: { cycleMonth: string; totalGrossSalary: number; netPayable: number }): Promise<PayrollRun> {
    return fetchEnvelope<PayrollRun>(`${API_BASE}/payroll`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getRecruitment(): Promise<Candidate[]> {
    return fetchEnvelope<Candidate[]>(`${API_BASE}/recruitment`);
  },

  async createCandidate(payload: Partial<Candidate>): Promise<Candidate> {
    return fetchEnvelope<Candidate>(`${API_BASE}/recruitment`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPerformance(): Promise<PerformanceGoal[]> {
    return fetchEnvelope<PerformanceGoal[]>(`${API_BASE}/performance`);
  },

  async getPendingApprovals(): Promise<HrApprovalItem[]> {
    return fetchEnvelope<HrApprovalItem[]>(`${API_BASE}/approvals`);
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
