import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
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
      SELECT * FROM ai_finance_procurement
      WHERE tenant_id = ${auth.user.tenantId}::uuid
      ORDER BY created_at DESC
      LIMIT 100
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

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;
    const body = await request.json();

    const {
      itemName,
      suggestedVendorName,
      historicalQuoteAmount = 0,
      recommendedAllocationAmount = 0,
      savingsPercentage,
      cashBurnTrajectory = "OPTIMAL",
    } = body;

    if (!itemName || !suggestedVendorName) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Item description and vendor name are required." },
        meta: null,
      }, { status: 400 });
    }

    const histAmount = Number(historicalQuoteAmount) || 0;
    const recAmount = Number(recommendedAllocationAmount) || 0;
    let savingsPct = Number(savingsPercentage);
    if (isNaN(savingsPct) && histAmount > 0) {
      savingsPct = Number((((histAmount - recAmount) / histAmount) * 100).toFixed(2));
    }
    if (isNaN(savingsPct)) savingsPct = 0;

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO ai_finance_procurement (
        tenant_id, item_name, suggested_vendor_name, historical_quote_amount,
        recommended_allocation_amount, savings_percentage, cash_burn_trajectory
      ) VALUES (
        ${tenantId}::uuid,
        ${itemName.trim()},
        ${suggestedVendorName.trim()},
        ${histAmount},
        ${recAmount},
        ${savingsPct},
        ${cashBurnTrajectory.trim().toUpperCase()}
      )
      RETURNING *
    `;

    const r = inserted[0];
    const mapped = {
      id: r.id,
      itemName: r.item_name,
      suggestedVendorName: r.suggested_vendor_name,
      historicalQuoteAmount: Number(r.historical_quote_amount || 0),
      recommendedAllocationAmount: Number(r.recommended_allocation_amount || 0),
      savingsPercentage: Number(r.savings_percentage || 0),
      cashBurnTrajectory: r.cash_burn_trajectory,
    };

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: null,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "FINANCE_PROCUREMENT_CREATE_ERROR",
        message: safeErrorMessage(err, "Procurement allocation advisory could not be recorded"),
      },
      meta: null,
    }, { status: 500 });
  }
}
