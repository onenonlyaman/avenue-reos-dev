import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;

    const records = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        tenant_id,
        operating_period,
        customer_inflows_lakhs,
        vendor_outflows_lakhs,
        debt_service_lakhs,
        net_operating_cashflow_lakhs,
        dscr_ratio,
        solvency_status,
        created_at,
        updated_at
      FROM analytics_liquidity
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `;

    const mapped = (records || []).map((r: any) => {
      const inflows = Number(r.customer_inflows_lakhs ?? r.customerInflowsLakhs ?? 0);
      const outflows = Number(r.vendor_outflows_lakhs ?? r.vendorOutflowsLakhs ?? 0);
      const debt = Number(r.debt_service_lakhs ?? r.debtServiceLakhs ?? 0);
      const netCash = inflows - outflows;

      let dscr: number;
      if (debt > 0) {
        dscr = Number((netCash / debt).toFixed(2));
      } else {
        dscr = netCash >= 0 ? 99.9 : 0.0;
      }

      let status: "Healthy Solvency" | "Debt Caution" | "Liquidity Risk" = "Healthy Solvency";
      if (netCash < 0 || (debt > 0 && dscr < 1.15)) {
        status = "Liquidity Risk";
      } else if (debt > 0 && dscr < 1.5) {
        status = "Debt Caution";
      }

      return {
        id: r.id,
        operatingPeriod: r.operating_period || r.operatingPeriod || "",
        customerInflowsLakhs: inflows,
        vendorOutflowsLakhs: outflows,
        debtServiceLakhs: debt,
        netOperatingCashflowLakhs: netCash,
        dscrRatio: dscr,
        solvencyStatus: status,
      };
    });

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
        code: "LIQUIDITY_FETCH_ERROR",
        message: safeErrorMessage(err, "Liquidity cashflow metrics could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { operatingPeriod, customerInflowsLakhs, vendorOutflowsLakhs, debtServiceLakhs } = body;
    const tenantId = auth.user.tenantId;

    if (!operatingPeriod || typeof operatingPeriod !== "string" || operatingPeriod.trim().length === 0) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Operating period description is required." },
        meta: null,
      }, { status: 400 });
    }

    const inflows = Math.max(0, Number(customerInflowsLakhs ?? 0));
    const outflows = Math.max(0, Number(vendorOutflowsLakhs ?? 0));
    const debt = Math.max(0, Number(debtServiceLakhs ?? 0));
    const netCash = inflows - outflows;

    let dscr: number;
    if (debt > 0) {
      dscr = Number((netCash / debt).toFixed(2));
    } else {
      dscr = netCash >= 0 ? 99.9 : 0.0;
    }

    let status: "Healthy Solvency" | "Debt Caution" | "Liquidity Risk" = "Healthy Solvency";
    if (netCash < 0 || (debt > 0 && dscr < 1.15)) {
      status = "Liquidity Risk";
    } else if (debt > 0 && dscr < 1.5) {
      status = "Debt Caution";
    }

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO analytics_liquidity (
        tenant_id,
        operating_period,
        customer_inflows_lakhs,
        vendor_outflows_lakhs,
        debt_service_lakhs,
        net_operating_cashflow_lakhs,
        dscr_ratio,
        solvency_status,
        created_at,
        updated_at
      ) VALUES (
        ${tenantId}::uuid,
        ${operatingPeriod.trim()},
        ${inflows},
        ${outflows},
        ${debt},
        ${netCash},
        ${dscr},
        ${status},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const created = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        operatingPeriod: created.operating_period,
        customerInflowsLakhs: inflows,
        vendorOutflowsLakhs: outflows,
        debtServiceLakhs: debt,
        netOperatingCashflowLakhs: netCash,
        dscrRatio: dscr,
        solvencyStatus: status,
      },
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
        code: "LIQUIDITY_SIMULATE_ERROR",
        message: safeErrorMessage(err, "Cashflow scenario simulation could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}
