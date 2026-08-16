export interface GstCalculationResult {
  mode: "EXCLUSIVE" | "INCLUSIVE";
  inputPrice: number;
  gstRate: number;
  basePrice: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalInvoicePrice: number;
}

export interface CashflowModelPeriod {
  periodLabel: string;
  netOperatingIncome: number;
  deltaReceivables: number;
  deltaPayables: number;
  nonCashDepreciation: number;
  netCashflow: number;
  cumulativeLiquidity: number;
}

export interface SesForecastPoint {
  period: string;
  actualRevenue?: number;
  forecastedRevenue: number;
  error?: number;
}

/**
 * Evaluates invariant GST tax math (Exclusive addition or Inclusive extraction)
 */
export function calculateGst(
  price: number,
  gstRate: number,
  mode: "EXCLUSIVE" | "INCLUSIVE" = "EXCLUSIVE",
  isInterState: boolean = false
): GstCalculationResult {
  const p = Number(price) || 0;
  const r = Number(gstRate) || 0;

  let basePrice = 0;
  let gstAmount = 0;
  let totalInvoicePrice = 0;

  if (mode === "EXCLUSIVE") {
    basePrice = p;
    gstAmount = Math.round(basePrice * (r / 100) * 100) / 100;
    totalInvoicePrice = Math.round((basePrice + gstAmount) * 100) / 100;
  } else {
    totalInvoicePrice = p;
    basePrice = Math.round((totalInvoicePrice / (1 + r / 100)) * 100) / 100;
    gstAmount = Math.round((totalInvoicePrice - basePrice) * 100) / 100;
  }

  const cgstAmount = isInterState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
  const sgstAmount = isInterState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
  const igstAmount = isInterState ? gstAmount : 0;

  return {
    mode,
    inputPrice: p,
    gstRate: r,
    basePrice,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalInvoicePrice,
  };
}

/**
 * Working Capital Liquidity Modeler
 * Formula: CF_t = N_t + Delta_AR_t - Delta_AP_t + NonCash_t
 */
export function generateCashflowLiquidityModel(
  startingBalance: number,
  periods: {
    periodLabel: string;
    netOperatingIncome: number;
    deltaReceivables: number;
    deltaPayables: number;
    nonCashDepreciation: number;
  }[]
): CashflowModelPeriod[] {
  let runningLiquidity = Number(startingBalance) || 0;
  const results: CashflowModelPeriod[] = [];

  for (const p of periods) {
    const netCF = p.netOperatingIncome + p.deltaReceivables - p.deltaPayables + p.nonCashDepreciation;
    runningLiquidity += netCF;

    results.push({
      periodLabel: p.periodLabel,
      netOperatingIncome: p.netOperatingIncome,
      deltaReceivables: p.deltaReceivables,
      deltaPayables: p.deltaPayables,
      nonCashDepreciation: p.nonCashDepreciation,
      netCashflow: Math.round(netCF * 100) / 100,
      cumulativeLiquidity: Math.round(runningLiquidity * 100) / 100,
    });
  }

  return results;
}

/**
 * Single Exponential Smoothing (SES) Revenue Forecaster
 * Formula: F_{t+1} = alpha * Y_t + (1 - alpha) * F_t
 */
export function executeSesRevenueForecast(
  historicalMonthlyRevenue: { period: string; revenue: number }[],
  alpha: number = 0.3,
  futurePeriodsToProject: number = 3
): SesForecastPoint[] {
  if (!historicalMonthlyRevenue || historicalMonthlyRevenue.length === 0) {
    return [];
  }

  const cleanAlpha = Math.max(0.01, Math.min(0.99, Number(alpha) || 0.3));
  const points: SesForecastPoint[] = [];

  let currentForecast = historicalMonthlyRevenue[0].revenue;

  for (let i = 0; i < historicalMonthlyRevenue.length; i++) {
    const actual = historicalMonthlyRevenue[i].revenue;
    const period = historicalMonthlyRevenue[i].period;

    if (i === 0) {
      points.push({
        period,
        actualRevenue: actual,
        forecastedRevenue: actual,
        error: 0,
      });
      currentForecast = actual;
    } else {
      const forecastForThisPeriod = currentForecast;
      const error = actual - forecastForThisPeriod;
      points.push({
        period,
        actualRevenue: actual,
        forecastedRevenue: Math.round(forecastForThisPeriod * 100) / 100,
        error: Math.round(error * 100) / 100,
      });
      currentForecast = cleanAlpha * actual + (1 - cleanAlpha) * forecastForThisPeriod;
    }
  }

  for (let f = 1; f <= futurePeriodsToProject; f++) {
    points.push({
      period: `Forecast Period +${f}`,
      forecastedRevenue: Math.round(currentForecast * 100) / 100,
    });
  }

  return points;
}

/**
 * Overdue Bill Interest Calculation
 * Formula: I_overdue = P_outstanding * (r / 100) * (d / 365)
 */
export function calculateOverdueInterest(
  outstandingPrincipal: number,
  annualInterestRatePct: number,
  daysOverdue: number,
  graceDays: number = 0
): {
  interestAmount: number;
  effectiveDays: number;
  totalPayableWithInterest: number;
} {
  const effectiveDays = Math.max(0, daysOverdue - graceDays);
  if (outstandingPrincipal <= 0 || effectiveDays <= 0 || annualInterestRatePct <= 0) {
    return {
      interestAmount: 0,
      effectiveDays: 0,
      totalPayableWithInterest: outstandingPrincipal,
    };
  }

  const interest = outstandingPrincipal * (annualInterestRatePct / 100) * (effectiveDays / 365);
  const interestAmount = Math.round(interest * 100) / 100;

  return {
    interestAmount,
    effectiveDays,
    totalPayableWithInterest: Math.round((outstandingPrincipal + interestAmount) * 100) / 100,
  };
}
