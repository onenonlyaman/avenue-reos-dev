import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const budgets = await prisma.budgetHead.findMany({ where: { tenantId: ACTIVE_TENANT_ID } });
    const bookings = await prisma.salesBooking.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      include: { unit: { select: { projectId: true } } },
    });
    const ledgerEntries = await prisma.generalLedgerEntry.findMany({ where: { tenantId: ACTIVE_TENANT_ID } });
    const projects = await prisma.masterProject.findMany({ where: { tenantId: ACTIVE_TENANT_ID }, orderBy: { projectName: "asc" } });

    let totalAllocated = 0;
    let totalCommitted = 0;
    let totalSpent = 0;

    budgets.forEach((b) => {
      totalAllocated += Number(b.allocatedAmount);
      totalCommitted += Number(b.committedAmount);
      totalSpent += Number(b.actualSpentAmount);
    });

    let totalBookingReceivable = 0;
    bookings.forEach((b) => {
      totalBookingReceivable += Number(b.agreedTotalPrice);
    });

    let totalDebit = 0;
    let totalCredit = 0;
    ledgerEntries.forEach((g) => {
      totalDebit += Number(g.debitAmount);
      totalCredit += Number(g.creditAmount);
    });

    // 70% statutory RERA customer collections mandatory deposit
    const cashInEscrowCr = Number(((totalBookingReceivable * 0.70) / 10000000).toFixed(2));
    const operationalCashCr = Number((totalCredit / 10000000).toFixed(2));
    const accountsReceivableCr = Number(((totalBookingReceivable * 0.30) / 10000000).toFixed(2));
    const accountsPayableCr = Number((totalCommitted / 10000000).toFixed(2));
    const ytdProfitMarginPct = totalAllocated > 0 ? Number((((totalAllocated - totalSpent) / totalAllocated) * 100).toFixed(1)) : 0;

    const projectEscrows = projects.map((p) => {
      const projBookings = bookings.filter((b) => b.unit?.projectId === p.id);
      const projBookingTotal = projBookings.reduce((sum, b) => sum + Number(b.agreedTotalPrice), 0);
      const escrowCr = projBookingTotal > 0
        ? Number(((projBookingTotal * 0.70) / 10000000).toFixed(2))
        : Number(((Number(p.totalBudget) * 0.20) / 10000000).toFixed(2));

      return {
        id: p.id,
        projectName: p.projectName,
        location: p.location,
        escrowCr,
      };
    });

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        cashInEscrowCr,
        operationalCashCr,
        accountsReceivableCr,
        accountsPayableCr,
        ytdProfitMarginPct,
        quarterlyBudgetAllocatedCr: Number((totalAllocated / 10000000).toFixed(2)),
        quarterlyBudgetCommittedCr: accountsPayableCr,
        quarterlyBudgetDisbursedCr: Number((totalSpent / 10000000).toFixed(2)),
        projectEscrows,
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
        code: "FINANCE_OVERVIEW_ERROR",
        message: safeErrorMessage(err, "Financial overview could not be loaded"),
      },
      meta: null,
    }, { status: 500 });
  }
}
