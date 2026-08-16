import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureAccountingSchema } from "@/lib/accounting/ensureAccountingSchema";
import { executeVoucherCreation, VoucherLineInput, BillRefInput, VoucherType } from "@/lib/accounting/voucherEngine";
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

    const rawVouchers = await prisma.$queryRaw<any[]>`
      SELECT v.id, v.voucher_number as "voucherNumber", v.voucher_type as "voucherType",
             v.book_type as "bookType", v.voucher_date as "voucherDate",
             v.reference_number as "referenceNumber", v.narration,
             v.total_amount as "totalAmount", v.currency, v.exchange_rate as "exchangeRate",
             v.status, v.requires_hitl as "requiresHitl", v.created_at as "createdAt"
      FROM tally_vouchers v
      WHERE v.tenant_id = ${tenantId}::uuid
        AND (${requestedScope} = 'BOTH' OR v.book_type = ${requestedScope})
      ORDER BY v.voucher_date DESC, v.created_at DESC;
    `;

    const rawItems = await prisma.$queryRaw<any[]>`
      SELECT i.id, i.voucher_id as "voucherId", i.ledger_id as "ledgerId",
             l.ledger_name as "ledgerName", l.ledger_code as "ledgerCode",
             i.cost_center_id as "costCenterId", i.entry_type as "entryType",
             i.amount, i.bill_reference as "billReference", i.particulars, i.line_number as "lineNumber"
      FROM tally_voucher_items i
      JOIN tally_account_ledgers l ON i.ledger_id = l.id
      WHERE i.tenant_id = ${tenantId}::uuid
      ORDER BY i.line_number ASC;
    `;

    const rawAuditLogs = await prisma.$queryRaw<any[]>`
      SELECT a.id, a.voucher_id as "voucherId", a.modified_by_user_id as "user",
             a.action_type as "action", a.timestamp, a.crypto_hash as "cryptoHash",
             a.reason_for_change as "reason", a.new_payload as "newPayload"
      FROM tally_accounting_audit_log a
      WHERE a.tenant_id = ${tenantId}::uuid
      ORDER BY a.timestamp DESC
      LIMIT 100;
    `;

    const mappedVouchers = rawVouchers.map((v) => {
      const itemsForV = rawItems.filter((it) => it.voucherId === v.id);
      const debitItem = itemsForV.find((it) => it.entryType === "Dr");
      const creditItem = itemsForV.find((it) => it.entryType === "Cr");

      return {
        id: v.id,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        bookType: v.bookType,
        postingDate: v.voucherDate ? new Date(v.voucherDate).toISOString() : new Date().toISOString(),
        referenceNumber: v.referenceNumber || "",
        narration: v.narration || "",
        totalAmount: Number(v.totalAmount),
        currency: v.currency || "INR",
        status: v.status,
        requiresHitl: Boolean(v.requiresHitl),
        debitLedgerName: debitItem?.ledgerName || "Debit Ledger Account",
        creditLedgerName: creditItem?.ledgerName || "Credit Ledger Account",
        entries: itemsForV.map((it) => ({
          id: it.id,
          ledgerId: it.ledgerId,
          ledgerName: it.ledgerName,
          costCenterId: it.costCenterId || "",
          entryType: it.entryType,
          debitAmount: it.entryType === "Dr" ? Number(it.amount) : 0,
          creditAmount: it.entryType === "Cr" ? Number(it.amount) : 0,
          billReference: it.billReference || "",
          particulars: it.particulars || "",
        })),
      };
    });

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mappedVouchers,
      auditLogs: rawAuditLogs.map((a) => ({
        id: a.id,
        voucherId: a.voucherId,
        user: a.user,
        action: a.action,
        timestamp: a.timestamp ? new Date(a.timestamp).toISOString() : new Date().toISOString(),
        cryptoHash: a.cryptoHash || "",
        reason: a.reason || "General Ledger Entry",
        newPayload: a.newPayload,
      })),
      error: null,
      meta: { total_records: mappedVouchers.length, book_scope: requestedScope },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: [],
        auditLogs: [],
        error: {
          code: "TALLY_VOUCHERS_FETCH_ERROR",
          message: safeErrorMessage(err, "Failed to fetch double-entry vouchers"),
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
    const body = await request.json();
    const userRole = request.headers.get("x-user-role") || auth.user.role || "ACCOUNTANT";
    const operatorId = request.headers.get("x-user-id") || auth.user.id || "usr-finance-executive";
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

    const bookType = (body.bookType || "STATUTORY") as "STATUTORY" | "INTERNAL";
    if (bookType === "INTERNAL") {
      assertBookScopeAccess(userRole, "INTERNAL");
    }

    let items: VoucherLineInput[] = [];

    if (Array.isArray(body.items) && body.items.length > 0) {
      items = body.items.map((it: any) => ({
        ledgerId: it.ledgerId,
        costCenterId: it.costCenterId || null,
        entryType: it.entryType as "Dr" | "Cr",
        amount: Number(it.amount),
        billReference: it.billReference || null,
        particulars: it.particulars || null,
      }));
    } else if (body.debitLedgerId && body.creditLedgerId && body.totalAmount) {
      const numAmt = Number(body.totalAmount);
      items = [
        {
          ledgerId: body.debitLedgerId,
          costCenterId: body.costCenterId || null,
          entryType: "Dr",
          amount: numAmt,
          billReference: body.billNumber || null,
          particulars: body.narration || null,
        },
        {
          ledgerId: body.creditLedgerId,
          costCenterId: body.costCenterId || null,
          entryType: "Cr",
          amount: numAmt,
          billReference: body.billNumber || null,
          particulars: body.narration || null,
        },
      ];
    } else {
      return NextResponse.json(
        {
          success: false,
          status_code: 400,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: {
            code: "INVALID_VOUCHER_PAYLOAD",
            message: "Debit ledger, credit ledger, and positive transaction amount are required.",
          },
          meta: null,
        },
        { status: 400 }
      );
    }

    let billRefs: BillRefInput[] | undefined = undefined;
    if (body.billNumber && Number(body.totalAmount) > 0) {
      billRefs = [
        {
          billNumber: body.billNumber,
          refType: (body.billReferenceType || "NEW_REF") as any,
          originalAmount: Number(body.totalAmount),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
      ];
    }

    const result = await executeVoucherCreation({
      voucherType: (body.voucherType || "RECEIPT") as VoucherType,
      bookType,
      voucherDate: body.postingDate || body.voucherDate,
      referenceNumber: body.referenceNumber || body.billNumber || null,
      narration: body.narration || "General Ledger double-entry voucher",
      items,
      billRefs,
      operatorId,
      reasonForChange: body.auditReason || `Posted ${bookType} voucher`,
      clientIp,
    });

    return NextResponse.json(
      {
        success: true,
        status_code: 201,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          id: result.voucher.id,
          voucherNumber: result.voucher.voucher_number,
          voucherType: result.voucher.voucher_type,
          postingDate: result.voucher.voucher_date,
          narration: result.voucher.narration || "",
          totalAmount: Number(result.voucher.total_amount),
          status: result.voucher.status,
          requiresHitl: result.requiresHitl,
          cryptoHash: result.cryptoHash,
        },
        error: null,
        meta: null,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "TALLY_VOUCHER_CREATE_ERROR",
          message: safeErrorMessage(err, "Failed to record double-entry voucher"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;
    const body = await request.json();
    const { voucherId, action } = body;

    if (!voucherId || !action) {
      return NextResponse.json(
        {
          success: false,
          status_code: 400,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: { code: "INVALID_ACTION", message: "Voucher ID and Action required" },
          meta: null,
        },
        { status: 400 }
      );
    }

    // 1. Fetch voucher to verify existence and check idempotency
    const vouchers = await prisma.$queryRaw<any[]>`
      SELECT * FROM tally_vouchers WHERE id = ${voucherId}::uuid AND tenant_id = ${tenantId}::uuid;
    `;

    if (vouchers.length === 0) {
      throw new Error("Voucher not found.");
    }

    const existingVoucher = vouchers[0];
    if (existingVoucher.status === "POSTED" && action === "AUTHORIZE") {
      return NextResponse.json({
        success: true,
        status_code: 200,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: { success: true, status: "POSTED" },
        error: null,
        meta: null,
      });
    }

    const newStatus = action === "AUTHORIZE" ? "POSTED" : "CANCELLED";

    // 2. Perform status change, balance updates, and MCA audit log in an atomic transaction
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE tally_vouchers
        SET status = ${newStatus}, requires_hitl = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${voucherId}::uuid AND tenant_id = ${tenantId}::uuid;
      `;

      if (action === "AUTHORIZE") {
        const items = await tx.$queryRaw<any[]>`
          SELECT i.*, l.current_balance, g.nature
          FROM tally_voucher_items i
          JOIN tally_account_ledgers l ON i.ledger_id = l.id
          JOIN tally_account_groups g ON l.group_id = g.id
          WHERE i.voucher_id = ${voucherId}::uuid AND i.tenant_id = ${tenantId}::uuid;
        `;

        for (const it of items) {
          const currentBal = Number(it.current_balance || 0);
          const nature = it.nature as "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE";
          const isNormalDebit = nature === "ASSET" || nature === "EXPENSE";
          const amt = Number(it.amount);
          const newBal = isNormalDebit
            ? it.entry_type === "Dr" ? currentBal + amt : currentBal - amt
            : it.entry_type === "Cr" ? currentBal + amt : currentBal - amt;

          await tx.$executeRaw`
            UPDATE tally_account_ledgers
            SET current_balance = ${newBal}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${it.ledger_id}::uuid AND tenant_id = ${tenantId}::uuid;
          `;
        }
      }

      await tx.$executeRaw`
        INSERT INTO tally_accounting_audit_log (
          tenant_id, voucher_id, modified_by_user_id, action_type, timestamp, new_payload, ip_address, reason_for_change
        ) VALUES (
          ${tenantId}::uuid, ${voucherId}::uuid, ${auth.user.id || 'usr-governance-director'},
          ${action === 'AUTHORIZE' ? 'UPDATE' : 'CANCEL'}, CURRENT_TIMESTAMP,
          ${JSON.stringify({ status: newStatus, action })}::jsonb, '127.0.0.1',
          ${action === 'AUTHORIZE' ? 'Executive Director sign-off and posting' : 'Voucher rejected/cancelled'}
        );
      `;
    });

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, status: newStatus },
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
        data: null,
        error: {
          code: "TALLY_VOUCHER_PATCH_ERROR",
          message: safeErrorMessage(err, "Failed to update voucher status"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
