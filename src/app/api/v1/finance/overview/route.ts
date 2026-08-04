import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const budgets = await prisma.budgetHead.findMany({ where: { tenantId: ACTIVE_TENANT_ID } });
    const bookings = await prisma.salesBooking.findMany({ where: { tenantId: ACTIVE_TENANT_ID } });
    const ledgerEntries = await prisma.generalLedgerEntry.findMany({ where: { tenantId: ACTIVE_TENANT_ID } });

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

    const cashInEscrowCr = Number(((totalBookingReceivable * 0.4) / 10000000).toFixed(2));
    const operationalCashCr = Number((totalCredit / 10000000).toFixed(2));
    const accountsReceivableCr = Number(((totalBookingReceivable * 0.6) / 10000000).toFixed(2));
    const accountsPayableCr = Number((totalCommitted / 10000000).toFixed(2));
    const ytdProfitMarginPct = totalAllocated > 0 ? Number((((totalAllocated - totalSpent) / totalAllocated) * 100).toFixed(1)) : 0;

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
        cashInEscrowCr: 0,
        operationalCashCr: 0,
        accountsReceivableCr: 0,
        accountsPayableCr: 0,
        ytdProfitMarginPct: 0,
        quarterlyBudgetAllocatedCr: 0,
        quarterlyBudgetCommittedCr: 0,
        quarterlyBudgetDisbursedCr: 0,
      },
      error: {
        code: "FINANCE_OVERVIEW_ERROR",
        message: err instanceof Error ? err.message : "Financial overview could not be loaded",
      },
      meta: null,
    });
  }
}
