import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureAccountingSchema } from "@/lib/accounting/ensureAccountingSchema";
import { calculatePhysicalCashDenominations, assertBookScopeAccess } from "@/lib/accounting/multiBookScope";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;
    const userRole = request.headers.get("x-user-role") || auth.user.role || "ACCOUNTANT";

    assertBookScopeAccess(userRole, "INTERNAL");

    // 1. Fetch Active Open Session
    const activeSessions = await prisma.$queryRaw<any[]>`
      SELECT id, session_date as "sessionDate", cashier_user_id as "cashierUserId",
             cashier_name as "cashierName", opening_balance as "openingBalance",
             notes_500 as "notes500", notes_200 as "notes200", notes_100 as "notes100",
             notes_50 as "notes50", notes_20 as "notes20", notes_10 as "notes10",
             coins_total as "coinsTotal", physical_counted_total as "physicalCountedTotal",
             system_expected_total as "systemExpectedTotal", variance_amount as "varianceAmount",
             status, remarks, created_at as "createdAt"
      FROM tally_cash_vault_sessions
      WHERE tenant_id = ${tenantId}::uuid AND status = 'OPEN'
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    // 2. Fetch Historical Closed Sessions
    const historicalSessions = await prisma.$queryRaw<any[]>`
      SELECT id, session_date as "sessionDate", cashier_user_id as "cashierUserId",
             cashier_name as "cashierName", opening_balance as "openingBalance",
             physical_counted_total as "physicalCountedTotal",
             system_expected_total as "systemExpectedTotal", variance_amount as "varianceAmount",
             status, remarks, created_at as "createdAt", closed_at as "closedAt"
      FROM tally_cash_vault_sessions
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
      LIMIT 30;
    `;

    // 3. Fetch Expected Cash Ledger Balance (System 0 Cash Ledgers)
    const cashLedgers = await prisma.$queryRaw<any[]>`
      SELECT l.id, l.ledger_name, l.current_balance
      FROM tally_account_ledgers l
      JOIN tally_account_groups g ON l.group_id = g.id
      WHERE l.tenant_id = ${tenantId}::uuid AND (l.book_type = 'INTERNAL' OR l.ledger_code = 'LED-CASH-01');
    `;

    const expectedCash = cashLedgers.reduce((acc, l) => acc + Number(l.current_balance || 0), 0);

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        activeSession: activeSessions[0] || null,
        history: historicalSessions.map((s) => ({
          id: s.id,
          date: s.sessionDate ? new Date(s.sessionDate).toISOString().split("T")[0] : "",
          cashierName: s.cashierName || "Head Cashier",
          openingBalance: Number(s.openingBalance),
          physicalCountedTotal: Number(s.physicalCountedTotal),
          systemExpectedTotal: Number(s.systemExpectedTotal),
          varianceAmount: Number(s.varianceAmount),
          status: s.status,
          remarks: s.remarks || "",
          createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : "",
          closedAt: s.closedAt ? new Date(s.closedAt).toISOString() : null,
        })),
        systemExpectedCash: expectedCash,
        cashLedgers: cashLedgers.map((l) => ({
          id: l.id,
          name: l.ledger_name,
          balance: Number(l.current_balance),
        })),
      },
      error: null,
      meta: { history_count: historicalSessions.length },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: { activeSession: null, history: [], systemExpectedCash: 0, cashLedgers: [] },
        error: {
          code: "CASH_VAULT_FETCH_ERROR",
          message: safeErrorMessage(err, "Failed to load Cash Vault register data"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;
    const userRole = request.headers.get("x-user-role") || auth.user.role || "ACCOUNTANT";
    const operatorId = request.headers.get("x-user-id") || auth.user.id || "usr-cashier";
    const body = await request.json();

    assertBookScopeAccess(userRole, "INTERNAL");

    // 1. Open Session Action
    if (body.action === "OPEN_SESSION") {
      const { cashierName, openingBalance } = body;
      const opBal = Number(openingBalance) || 0;

      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO tally_cash_vault_sessions (
          tenant_id, cashier_user_id, cashier_name, opening_balance, system_expected_total, status
        ) VALUES (
          ${tenantId}::uuid, ${operatorId}, ${cashierName || 'Head Cashier'}, ${opBal}, ${opBal}, 'OPEN'
        )
        RETURNING id, session_date as "sessionDate", cashier_name as "cashierName", opening_balance as "openingBalance", status;
      `;

      return NextResponse.json({ success: true, message: "Cash vault shift opened successfully.", session: inserted[0] }, { status: 201 });
    }

    // 2. Close Session Action with Denomination Math
    if (body.action === "CLOSE_SESSION" || body.sessionId) {
      const { sessionId, counts, systemExpectedBalance, remarks } = body;

      const calc = calculatePhysicalCashDenominations(counts, Number(systemExpectedBalance) || 0);
      const sessionStatus = calc.isDiscrepancy ? "DISCREPANCY_FLAGGED" : "CLOSED";

      await prisma.$executeRaw`
        UPDATE tally_cash_vault_sessions
        SET notes_500 = ${Number(counts.notes500) || 0},
            notes_200 = ${Number(counts.notes200) || 0},
            notes_100 = ${Number(counts.notes100) || 0},
            notes_50 = ${Number(counts.notes50) || 0},
            notes_20 = ${Number(counts.notes20) || 0},
            notes_10 = ${Number(counts.notes10) || 0},
            coins_total = ${Number(counts.coinsTotal) || 0},
            physical_counted_total = ${calc.physicalCountedTotal},
            system_expected_total = ${calc.expectedSystemBalance},
            variance_amount = ${calc.varianceAmount},
            status = ${sessionStatus},
            remarks = ${remarks || null},
            closed_at = CURRENT_TIMESTAMP
        WHERE id = ${sessionId}::uuid AND tenant_id = ${tenantId}::uuid;
      `;

      return NextResponse.json({
        success: true,
        message: calc.isDiscrepancy
          ? `Shift closed with discrepancy flagged: Variance ₹${calc.varianceAmount.toFixed(2)}`
          : "Shift closed and physical notes verified with zero variance.",
        calculation: calc,
      });
    }

    return NextResponse.json({ success: false, error: { message: "Invalid cash vault action" } }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "CASH_VAULT_ACTION_ERROR",
          message: safeErrorMessage(err, "Failed to process cash vault session"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
