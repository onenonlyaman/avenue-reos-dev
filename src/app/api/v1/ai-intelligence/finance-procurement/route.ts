import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:ai_finance_procurement", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ai_finance_procurement (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        suggested_vendor_name VARCHAR(255) NOT NULL,
        historical_quote_amount NUMERIC(15,2) NOT NULL,
        recommended_allocation_amount NUMERIC(15,2) NOT NULL,
        savings_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
        cash_burn_trajectory VARCHAR(50) NOT NULL DEFAULT 'STABLE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM ai_finance_procurement WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      itemName: r.item_name,
      suggestedVendorName: r.suggested_vendor_name,
      historicalQuoteAmount: Number(r.historical_quote_amount || 0),
      recommendedAllocationAmount: Number(r.recommended_allocation_amount || 0),
      savingsPercentage: Number(r.savings_percentage || 0),
      cashBurnTrajectory: r.cash_burn_trajectory,
    }));

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: { total_records: mapped.length },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: [],
      error: {
        code: "FINANCE_PROCUREMENT_FETCH_ERROR",
        message: safeErrorMessage(err, "Finance procurement insights could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}



