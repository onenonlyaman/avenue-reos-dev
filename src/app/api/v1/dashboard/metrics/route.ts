import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { CRORE_IN_RUPEES } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

const CLOSED_LEAD_STATUSES = ["LOST", "CLOSED", "DROPPED"];
const BOOKED_UNIT_STATUSES = ["BOOKED", "RESERVED"];

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

  try {
    const [
      bookingSum,
      leadSum,
      leadCount,
      projectCount,
      totalUnitsCount,
      bookedUnitsCount,
      budgetSum,
      pendingBookingsCount,
      pendingVouchersCount,
    ] = await Promise.all([
      prisma.salesBooking.aggregate({
        where: { tenantId },
        _sum: { agreedTotalPrice: true },
      }),
      prisma.crmLead.aggregate({
        where: { tenantId, status: { notIn: CLOSED_LEAD_STATUSES } },
        _sum: { budgetMax: true },
      }),
      prisma.crmLead.count({
        where: { tenantId, status: { notIn: CLOSED_LEAD_STATUSES } },
      }),
      prisma.masterProject.count({ where: { tenantId } }),
      prisma.masterUnit.count({ where: { tenantId } }),
      prisma.masterUnit.count({
        where: { tenantId, status: { in: BOOKED_UNIT_STATUSES } },
      }),
      prisma.budgetHead.aggregate({
        where: { tenantId },
        _sum: { committedAmount: true },
      }),
      prisma.salesBooking.count({
        where: { tenantId, status: "PENDING_APPROVAL" },
      }),
      prisma.generalLedgerEntry.count({
        where: { tenantId, debitAmount: { gt: 1000000 } },
      }),
    ]);

    const bookingRevenue = Number(bookingSum._sum.agreedTotalPrice || 0);
    const leadDemand = Number(leadSum._sum.budgetMax || 0);
    const pipelineTotalCr = Number(((bookingRevenue + leadDemand) / CRORE_IN_RUPEES).toFixed(2));
    const committedBudgetCr = Number((Number(budgetSum._sum.committedAmount || 0) / CRORE_IN_RUPEES).toFixed(2));
    const inventoryRealizationPct =
      totalUnitsCount > 0 ? Number(((bookedUnitsCount / totalUnitsCount) * 100).toFixed(1)) : 0;
    const automatedWorkflowsCount = pendingBookingsCount + pendingVouchersCount;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        salesPipelineCr: pipelineTotalCr,
        constructionProgressPct: inventoryRealizationPct,
        committedBudgetCr,
        automatedWorkflowsCount,
        totalProjectsCount: projectCount,
        totalUnitsCount: totalUnitsCount,
        activeLeadsCount: leadCount,
      },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
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
          message: safeErrorMessage(err, "Dashboard metrics could not be loaded"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
