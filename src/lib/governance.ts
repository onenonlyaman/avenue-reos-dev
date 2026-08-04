function numericEnv(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const HITL_DISBURSEMENT_LIMIT = numericEnv(process.env.NEXT_PUBLIC_HITL_DISBURSEMENT_LIMIT, 1000000);
export const HITL_RA_BILL_LIMIT = numericEnv(process.env.NEXT_PUBLIC_HITL_RA_BILL_LIMIT, 2500000);
export const HITL_PROCUREMENT_LIMIT = numericEnv(process.env.NEXT_PUBLIC_HITL_PROCUREMENT_LIMIT, 1500000);
export const HITL_PAYROLL_LIMIT = numericEnv(process.env.NEXT_PUBLIC_HITL_PAYROLL_LIMIT, 1000000);
export const HITL_INTEGRATION_SYNC_LIMIT = numericEnv(process.env.NEXT_PUBLIC_HITL_INTEGRATION_SYNC_LIMIT, 1000000);
export const HITL_ELEVATED_AUTHORITY_LIMIT = numericEnv(process.env.NEXT_PUBLIC_HITL_ELEVATED_AUTHORITY_LIMIT, 1000000);
export const RA_BILL_PROGRESS_REVIEW_PCT = numericEnv(process.env.NEXT_PUBLIC_RA_BILL_PROGRESS_REVIEW_PCT, 70);
export const CRORE_IN_RUPEES = 10000000;
export const LAKH_IN_RUPEES = 100000;
export const ACTIVE_FISCAL_YEAR = process.env.NEXT_PUBLIC_ACTIVE_FISCAL_YEAR || "FY 2026-27";
export const HITL_LAND_ACQUISITION_LIMIT = numericEnv(process.env.NEXT_PUBLIC_HITL_LAND_ACQUISITION_LIMIT, 5000000);
export const STAMP_DUTY_RATE = numericEnv(process.env.NEXT_PUBLIC_STAMP_DUTY_RATE, 0.07);
export const REGISTRATION_FEE_RATE = numericEnv(process.env.NEXT_PUBLIC_REGISTRATION_FEE_RATE, 0.01);
