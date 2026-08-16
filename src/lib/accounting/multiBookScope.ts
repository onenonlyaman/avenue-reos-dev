export type BookScope = "STATUTORY" | "INTERNAL" | "BOTH";

export interface DenominationCounts {
  notes500: number;
  notes200: number;
  notes100: number;
  notes50: number;
  notes20: number;
  notes10: number;
  coinsTotal: number;
}

export interface CashVaultCalculationResult {
  notes500Total: number;
  notes200Total: number;
  notes100Total: number;
  notes50Total: number;
  notes20Total: number;
  notes10Total: number;
  coinsTotal: number;
  physicalCountedTotal: number;
  expectedSystemBalance: number;
  varianceAmount: number;
  isDiscrepancy: boolean;
}

export interface DealSplitCalculation {
  totalDealValue: number;
  agreementValueStatutory: number;
  cashComponentInternal: number;
  agreementPct: number;
  cashPct: number;
}

/**
 * Asserts that the operator role has sufficient authorization to access Internal (System 0) or Both scopes.
 */
export function assertBookScopeAccess(userRole?: string | null, requestedScope: BookScope = "STATUTORY"): boolean {
  if (requestedScope === "STATUTORY") {
    return true;
  }

  const elevatedRoles = [
    "GOVERNANCE_DIRECTOR",
    "SUPER_ADMIN",
    "DEVOPS_ADMIN",
    "DIRECTOR",
    "OWNER",
    "ACCOUNTS_HEAD",
    "FINANCE_HEAD",
    "CFO",
    "CHIEF_FINANCIAL_OFFICER",
    "ADMIN",
  ];

  const normalized = (userRole || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const hasElevated =
    Boolean(normalized) &&
    (elevatedRoles.includes(normalized) ||
      normalized.includes("DIRECTOR") ||
      normalized.includes("ADMIN") ||
      normalized.includes("CFO") ||
      normalized.includes("FINANCE") ||
      normalized.includes("GOVERNANCE"));

  if (!hasElevated) {
    throw new Error(`Access Denied: Higher management clearance required to access '${requestedScope}' book scope.`);
  }

  return true;
}

/**
 * Constructs SQL filter clause based on active BookScope
 */
export function buildBookScopeFilter(scope: BookScope = "STATUTORY", tableAlias: string = "v"): string {
  if (scope === "INTERNAL") {
    return `${tableAlias}.book_type = 'INTERNAL'`;
  }
  if (scope === "BOTH") {
    return `(${tableAlias}.book_type IN ('STATUTORY', 'INTERNAL'))`;
  }
  return `${tableAlias}.book_type = 'STATUTORY'`;
}

/**
 * Calculates physical cash denomination sum and variance against system expected total.
 * Invariant: physicalCountedTotal = sum(n_i * d_i) + coinsTotal
 */
export function calculatePhysicalCashDenominations(
  counts: DenominationCounts,
  systemExpectedCash: number
): CashVaultCalculationResult {
  const n500 = Number(counts.notes500) || 0;
  const n200 = Number(counts.notes200) || 0;
  const n100 = Number(counts.notes100) || 0;
  const n50 = Number(counts.notes50) || 0;
  const n20 = Number(counts.notes20) || 0;
  const n10 = Number(counts.notes10) || 0;
  const coins = Number(counts.coinsTotal) || 0;

  const notes500Total = n500 * 500;
  const notes200Total = n200 * 200;
  const notes100Total = n100 * 100;
  const notes50Total = n50 * 50;
  const notes20Total = n20 * 20;
  const notes10Total = n10 * 10;

  const physicalCountedTotal =
    notes500Total + notes200Total + notes100Total + notes50Total + notes20Total + notes10Total + coins;

  const expectedSystemBalance = Number(systemExpectedCash) || 0;
  const varianceAmount = Math.round((physicalCountedTotal - expectedSystemBalance) * 100) / 100;
  const isDiscrepancy = Math.abs(varianceAmount) > 0.01;

  return {
    notes500Total,
    notes200Total,
    notes100Total,
    notes50Total,
    notes20Total,
    notes10Total,
    coinsTotal: coins,
    physicalCountedTotal,
    expectedSystemBalance,
    varianceAmount,
    isDiscrepancy,
  };
}

/**
 * Computes Deal Split for real estate plot bookings (Statutory Agreement vs Internal Cash)
 * Total Deal Value = Agreement Value (Statutory) + Cash Component (Internal)
 */
export function calculateDealSplit(
  totalDealValue: number,
  agreementPct: number
): DealSplitCalculation {
  const total = Number(totalDealValue) || 0;
  const agrPct = Math.min(100, Math.max(0, Number(agreementPct) || 100));
  const cashPct = Math.round((100 - agrPct) * 100) / 100;

  const agreementValueStatutory = Math.round((total * (agrPct / 100)) * 100) / 100;
  const cashComponentInternal = Math.round((total - agreementValueStatutory) * 100) / 100;

  return {
    totalDealValue: total,
    agreementValueStatutory,
    cashComponentInternal,
    agreementPct: agrPct,
    cashPct,
  };
}
