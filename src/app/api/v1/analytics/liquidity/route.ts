import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const model = (prisma as any).analyticsLiquidity;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM analytics_liquidity WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => {
      const inflows = Number(r.customerInflowsLakhs ?? r.customer_inflows_lakhs ?? 0);
      const outflows = Number(r.vendorOutflowsLakhs ?? r.vendor_outflows_lakhs ?? 0);
      const debt = Number(r.debtServiceLakhs ?? r.debt_service_lakhs ?? 1);
      const netCash = inflows - outflows;
      const dscr = debt > 0 ? Number((netCash / debt).toFixed(2)) : 2.5;

      let status: "Healthy Solvency" | "Debt Caution" | "Liquidity Risk" = "Healthy Solvency";
      if (dscr < 1.15) status = "Liquidity Risk";
      else if (dscr < 1.5) status = "Debt Caution";

      return {
        id: r.id,
        operatingPeriod: r.operatingPeriod || r.operating_period || "",
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
        message: err instanceof Error ? err.message : "Liquidity cashflow metrics could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatingPeriod, customerInflowsLakhs, vendorOutflowsLakhs, debtServiceLakhs } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!operatingPeriod) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Operating period is required." },
        meta: null,
      });
    }

    const inflows = Number(customerInflowsLakhs || 0);
    const outflows = Number(vendorOutflowsLakhs || 0);
    const debt = Number(debtServiceLakhs || 1);
    const netCash = inflows - outflows;
    const dscr = debt > 0 ? Number((netCash / debt).toFixed(2)) : 2.5;

    let status: "Healthy Solvency" | "Debt Caution" | "Liquidity Risk" = "Healthy Solvency";
    if (dscr < 1.15) status = "Liquidity Risk";
    else if (dscr < 1.5) status = "Debt Caution";

    const model = (prisma as any).analyticsLiquidity;
    let created: any = null;

    if (model?.create) {
      created = await model.create({
        data: {
          tenantId,
          operatingPeriod,
          customerInflowsLakhs: inflows,
          vendorOutflowsLakhs: outflows,
          debtServiceLakhs: debt,
          netOperatingCashflowLakhs: netCash,
          dscrRatio: dscr,
          solvencyStatus: status,
        },
      });
    } else {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS analytics_liquidity (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            operating_period VARCHAR(50) NOT NULL,
            customer_inflows_lakhs DECIMAL(15,2) NOT NULL,
            vendor_outflows_lakhs DECIMAL(15,2) NOT NULL,
            debt_service_lakhs DECIMAL(15,2) NOT NULL,
            net_operating_cashflow_lakhs DECIMAL(15,2) NOT NULL,
            dscr_ratio DECIMAL(5,2) NOT NULL,
            solvency_status VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        const inserted = await prisma.$queryRaw<any[]>`
          INSERT INTO analytics_liquidity (
            tenant_id, operating_period, customer_inflows_lakhs,
            vendor_outflows_lakhs, debt_service_lakhs, net_operating_cashflow_lakhs,
            dscr_ratio, solvency_status
          ) VALUES (
            ${tenantId}::uuid, ${operatingPeriod}, ${inflows},
            ${outflows}, ${debt}, ${netCash},
            ${dscr}, ${status}
          )
          RETURNING *
        `;
        created = inserted[0];
      } catch (err: unknown) {
        throw new Error(err instanceof Error ? err.message : "Cash flow entry could not be saved");
      }
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        operatingPeriod: created.operatingPeriod || created.operating_period,
        customerInflowsLakhs: inflows,
        vendorOutflowsLakhs: outflows,
        debtServiceLakhs: debt,
        netOperatingCashflowLakhs: netCash,
        dscrRatio: dscr,
        solvencyStatus: status,
      },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "LIQUIDITY_SIMULATE_ERROR",
        message: err instanceof Error ? err.message : "Cashflow scenario simulation could not be saved",
      },
      meta: null,
    });
  }
}



