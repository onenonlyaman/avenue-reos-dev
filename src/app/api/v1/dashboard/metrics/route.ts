import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const bookings = await prisma.salesBooking.findMany({ where: { tenantId: ACTIVE_TENANT_ID } });
    const leads = await prisma.crmLead.findMany({ where: { tenantId: ACTIVE_TENANT_ID } });
    const projects = await prisma.masterProject.findMany({ where: { tenantId: ACTIVE_TENANT_ID }, include: { units: true } });
    const budgets = await prisma.budgetHead.findMany({ where: { tenantId: ACTIVE_TENANT_ID } });

    const pendingBookingsCount = await prisma.salesBooking.count({ where: { tenantId: ACTIVE_TENANT_ID, status: "PENDING_APPROVAL" } });
    const pendingGlCount = await prisma.generalLedgerEntry.count({ where: { tenantId: ACTIVE_TENANT_ID, debitAmount: { gt: 4000000 } } });

    let bookingRevenue = 0;
    bookings.forEach((b) => {
      bookingRevenue += Number(b.agreedTotalPrice);
    });

    let leadDemand = 0;
    leads.forEach((l) => {
      leadDemand += Number(l.budgetMax || 0);
    });

    const pipelineTotalCr = Number(((bookingRevenue + leadDemand) / 10000000).toFixed(2));

    let totalUnits = 0;
    let bookedUnits = 0;
    projects.forEach((p) => {
      totalUnits += p.units.length;
      bookedUnits += p.units.filter((u) => u.status === "BOOKED" || u.status === "RESERVED").length;
    });

    const constructionProgressPct = totalUnits > 0 ? Number(((bookedUnits / totalUnits) * 100).toFixed(1)) : 0;

    let totalCommitted = 0;
    budgets.forEach((b) => {
      totalCommitted += Number(b.committedAmount);
    });
    const committedBudgetCr = Number((totalCommitted / 10000000).toFixed(2));

    const automatedWorkflowsCount = pendingBookingsCount + pendingGlCount;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        salesPipelineCr: pipelineTotalCr,
        constructionProgressPct,
        committedBudgetCr,
        automatedWorkflowsCount,
        totalProjectsCount: projects.length,
        totalUnitsCount: totalUnits,
        activeLeadsCount: leads.length,
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
      data: {
        salesPipelineCr: 0,
        constructionProgressPct: 0,
        committedBudgetCr: 0,
        automatedWorkflowsCount: 0,
        totalProjectsCount: 0,
        totalUnitsCount: 0,
        activeLeadsCount: 0,
      },
      error: {
        code: "DASHBOARD_METRICS_ERROR",
        message: err instanceof Error ? err.message : "Dashboard metrics could not be loaded",
      },
      meta: null,
    });
  }
}
