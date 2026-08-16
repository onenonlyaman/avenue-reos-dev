import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureAccountingSchema } from "@/lib/accounting/ensureAccountingSchema";
import { BookScope, assertBookScopeAccess, buildBookScopeFilter } from "@/lib/accounting/multiBookScope";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;
    const url = new URL(request.url);
    const requestedScope = (url.searchParams.get("bookScope") || "STATUTORY") as BookScope;
    const userRole = request.headers.get("x-user-role") || auth.user.role || "ACCOUNTANT";

    assertBookScopeAccess(userRole, requestedScope);

    // 1. Fetch all ledgers with their group nature
    const ledgers = await prisma.$queryRaw<any[]>`
      SELECT l.id, l.ledger_code as "code", l.ledger_name as "name",
             g.group_name as "groupName", g.nature, l.current_balance as "balance",
             l.opening_balance_type as "type", l.book_type as "bookType"
      FROM tally_account_ledgers l
      JOIN tally_account_groups g ON l.group_id = g.id
      WHERE l.tenant_id = ${tenantId}::uuid
        AND (${requestedScope} = 'BOTH' OR l.book_type = ${requestedScope})
      ORDER BY g.nature ASC, l.ledger_name ASC;
    `;

    // 2. Fetch bill references for accurate aging calculation
    const billRefs = await prisma.$queryRaw<any[]>`
      SELECT b.id, b.bill_number as "billNumber", b.original_amount as "originalAmount",
             b.pending_amount as "pendingAmount", b.due_date as "dueDate",
             l.ledger_name as "partyName", g.nature,
             (CURRENT_DATE - b.due_date) as "daysOverdue"
      FROM tally_bill_references b
      JOIN tally_account_ledgers l ON b.ledger_id = l.id
      JOIN tally_account_groups g ON l.group_id = g.id
      WHERE b.tenant_id = ${tenantId}::uuid AND b.is_settled = false
      ORDER BY b.due_date ASC;
    `;

    // 3. Construct Trial Balance
    const trialBalance = ledgers.map((l) => {
      const bal = Number(l.balance);
      const isDebitNormal = l.nature === "ASSET" || l.nature === "EXPENSE";
      return {
        ledgerName: l.name,
        primaryGroup: l.groupName,
        nature: l.nature,
        debitAmount: isDebitNormal ? (bal >= 0 ? bal : 0) : bal < 0 ? Math.abs(bal) : 0,
        creditAmount: !isDebitNormal ? (bal >= 0 ? bal : 0) : bal < 0 ? Math.abs(bal) : 0,
      };
    });

    // 4. Construct Balance Sheet (Assets & Liabilities)
    const balanceSheet = ledgers
      .filter((l) => l.nature === "ASSET" || l.nature === "LIABILITY")
      .map((l) => ({
        category: l.nature === "ASSET" ? "Assets" : "Liabilities",
        subGroup: l.groupName,
        ledgerName: l.name,
        amount: Number(l.balance),
      }));

    // 5. Construct Profit & Loss (Income & Expense)
    const profitAndLoss = ledgers
      .filter((l) => l.nature === "INCOME" || l.nature === "EXPENSE")
      .map((l) => ({
        type: l.nature === "INCOME" ? "INCOME" : "EXPENSE",
        category: l.groupName,
        ledgerName: l.name,
        amount: Math.abs(Number(l.balance)),
      }));

    // 6. Construct Aging Slabs from live Bill References
    const agingReportMap: Record<string, { current: number; days15: number; days30: number; days45: number; days45Plus: number }> = {};

    billRefs.forEach((b) => {
      const party = b.partyName;
      if (!agingReportMap[party]) {
        agingReportMap[party] = { current: 0, days15: 0, days30: 0, days45: 0, days45Plus: 0 };
      }
      const days = Number(b.daysOverdue || 0);
      const amt = Number(b.pendingAmount || b.originalAmount || 0);

      if (days <= 0) agingReportMap[party].current += amt;
      else if (days <= 15) agingReportMap[party].days15 += amt;
      else if (days <= 30) agingReportMap[party].days30 += amt;
      else if (days <= 45) agingReportMap[party].days45 += amt;
      else agingReportMap[party].days45Plus += amt;
    });

    const agingReport = Object.keys(agingReportMap).map((partyName) => ({
      partyName,
      currentAmount: Math.round(agingReportMap[partyName].current * 100) / 100,
      days30: Math.round(agingReportMap[partyName].days15 * 100) / 100,
      days60: Math.round(agingReportMap[partyName].days30 * 100) / 100,
      days90: Math.round(agingReportMap[partyName].days45 * 100) / 100,
      days90Plus: Math.round(agingReportMap[partyName].days45Plus * 100) / 100,
    }));

    const totalAssets = balanceSheet
      .filter((b) => b.category === "Assets")
      .reduce((sum, b) => sum + b.amount, 0);

    const totalLiabilities = balanceSheet
      .filter((b) => b.category === "Liabilities")
      .reduce((sum, b) => sum + Math.abs(b.amount), 0);

    const netWorkingCapital = totalAssets - totalLiabilities;
    const totalIncome = profitAndLoss.filter((p) => p.type === "INCOME").reduce((s, p) => s + p.amount, 0);
    const totalExpense = profitAndLoss.filter((p) => p.type === "EXPENSE").reduce((s, p) => s + p.amount, 0);
    const monthlyBurn = totalExpense > 0 ? totalExpense / 12 : (totalLiabilities > 0 ? totalLiabilities / 12 : 0);
    const cashRunwayMonths = totalAssets > 0 && monthlyBurn > 0 ? Math.round((totalAssets / monthlyBurn) * 10) / 10 : (totalAssets > 0 ? 99.9 : 0);

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        balanceSheet,
        profitAndLoss,
        trialBalance,
        agingReport,
        totalAssets,
        totalLiabilities,
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
        cashRunwayMonths,
        netWorkingCapital,
      },
      error: null,
      meta: { total_ledgers: ledgers.length, book_scope: requestedScope },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          balanceSheet: [],
          profitAndLoss: [],
          trialBalance: [],
          agingReport: [],
          totalAssets: 0,
          totalLiabilities: 0,
          totalIncome: 0,
          totalExpense: 0,
          netProfit: 0,
          cashRunwayMonths: 0,
          netWorkingCapital: 0,
        },
        error: {
          code: "FINANCIAL_REPORTS_ERROR",
          message: safeErrorMessage(err, "Failed to compile financial statements"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
