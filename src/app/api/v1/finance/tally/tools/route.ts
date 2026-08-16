import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import {
  calculateGst,
  generateCashflowLiquidityModel,
  executeSesRevenueForecast,
  calculateOverdueInterest,
} from "@/lib/accounting/financialToolsEngine";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { toolType } = body;

    // 1. GST Calculator
    if (toolType === "GST_CALCULATOR") {
      const { price, gstRate, mode, isInterState } = body;
      const res = calculateGst(price, gstRate, mode, isInterState);
      return NextResponse.json({ success: true, result: res });
    }

    // 2. Working Capital Liquidity Modeler
    if (toolType === "CASHFLOW_LIQUIDITY") {
      const { startingBalance, periods } = body;
      const res = generateCashflowLiquidityModel(startingBalance, periods || []);
      return NextResponse.json({ success: true, result: res });
    }

    // 3. Single Exponential Smoothing (SES) Revenue Forecaster
    if (toolType === "REVENUE_FORECAST_SES") {
      const { historicalData, alpha, futurePeriods } = body;
      const res = executeSesRevenueForecast(historicalData || [], alpha, futurePeriods);
      return NextResponse.json({ success: true, result: res });
    }

    // 4. Overdue Bill Interest Calculator
    if (toolType === "OVERDUE_INTEREST") {
      const { outstandingPrincipal, annualInterestRatePct, daysOverdue, graceDays } = body;
      const res = calculateOverdueInterest(outstandingPrincipal, annualInterestRatePct, daysOverdue, graceDays);
      return NextResponse.json({ success: true, result: res });
    }

    return NextResponse.json(
      { success: false, error: { message: `Unsupported financial tool type: ${toolType}` } },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "FINANCIAL_TOOL_ERROR",
          message: safeErrorMessage(err, "Failed to compute financial tool calculations"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
