import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

async function ensureTallyTables() {
  await runtimeDdl("table:tally_chart_of_accounts", () => prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tally_chart_of_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      primary_group VARCHAR(100) NOT NULL,
      sub_group VARCHAR(100) NOT NULL,
      ledger_name VARCHAR(255) NOT NULL,
      ledger_type VARCHAR(50) NOT NULL DEFAULT 'BALANCE_SHEET',
      opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
      gstin VARCHAR(20),
      pan VARCHAR(20),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await runtimeDdl("table:tally_vouchers", () => prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tally_vouchers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      voucher_type VARCHAR(50) NOT NULL,
      voucher_number VARCHAR(100) NOT NULL,
      posting_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      narration TEXT,
      is_optional BOOLEAN NOT NULL DEFAULT false,
      is_reversing BOOLEAN NOT NULL DEFAULT false,
      total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) NOT NULL DEFAULT 'POSTED',
      requires_hitl BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await runtimeDdl("table:tally_voucher_entries", () => prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tally_voucher_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      voucher_id UUID NOT NULL,
      ledger_id UUID NOT NULL,
      cost_center_id VARCHAR(100),
      debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      fx_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
      bill_reference_type VARCHAR(50),
      bill_number VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await runtimeDdl("table:tally_mca_edit_logs", () => prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tally_mca_edit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      voucher_id UUID NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_id VARCHAR(255) NOT NULL,
      ip_address VARCHAR(50) NOT NULL DEFAULT '127.0.0.1',
      field_changes_json TEXT NOT NULL
    )
  `);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureTallyTables();
    const tenantId = ACTIVE_TENANT_ID;

    const rawVouchers = await prisma.$queryRaw<any[]>`
      SELECT v.*
      FROM tally_vouchers v
      WHERE v.tenant_id = ${tenantId}::uuid
      ORDER BY v.created_at DESC
    `;

    const rawEntries = await prisma.$queryRaw<any[]>`
      SELECT e.*, l.ledger_name
      FROM tally_voucher_entries e
      LEFT JOIN tally_chart_of_accounts l ON e.ledger_id = l.id
      WHERE e.tenant_id = ${tenantId}::uuid
    `;

    const mapped = rawVouchers.map((v) => {
      const entriesForVoucher = rawEntries.filter((e) => e.voucher_id === v.id);
      const debitEntry = entriesForVoucher.find((e) => Number(e.debit_amount) > 0);
      const creditEntry = entriesForVoucher.find((e) => Number(e.credit_amount) > 0);

      return {
        id: v.id,
        voucherNumber: v.voucher_number,
        voucherType: v.voucher_type,
        postingDate: v.posting_date ? new Date(v.posting_date).toISOString() : new Date().toISOString(),
        narration: v.narration || "",
        totalAmount: Number(v.total_amount),
        status: v.status,
        requiresHitl: Boolean(v.requires_hitl),
        isOptional: Boolean(v.is_optional),
        isReversing: Boolean(v.is_reversing),
        debitLedgerName: debitEntry?.ledger_name || "Debit Ledger Account",
        creditLedgerName: creditEntry?.ledger_name || "Credit Ledger Account",
        entries: entriesForVoucher.map((e) => ({
          id: e.id,
          ledgerId: e.ledger_id,
          ledgerName: e.ledger_name || "Ledger Account",
          costCenterId: e.cost_center_id || "",
          debitAmount: Number(e.debit_amount),
          creditAmount: Number(e.credit_amount),
          fxRate: Number(e.fx_rate || 1),
          billReferenceType: e.bill_reference_type || "",
          billNumber: e.bill_number || "",
        })),
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
        code: "TALLY_VOUCHERS_FETCH_ERROR",
        message: safeErrorMessage(err, "Failed to fetch double-entry vouchers"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureTallyTables();
    const tenantId = ACTIVE_TENANT_ID;
    const body = await request.json();

    const {
      voucherType,
      narration,
      debitLedgerId,
      creditLedgerId,
      totalAmount,
      billReferenceType,
      billNumber,
      costCenterId,
    } = body;

    const numAmount = Number(totalAmount || 0);
    if (!numAmount || !voucherType || !debitLedgerId || !creditLedgerId) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INVALID_VOUCHER_PAYLOAD",
          message: "Voucher type, debit ledger, credit ledger, and valid amount are required",
        },
        meta: null,
      }, { status: 400 });
    }

    const requiresHitl = numAmount > 1000000;
    const status = requiresHitl ? "PENDING_APPROVAL" : "POSTED";
    const prefix = (voucherType || "VOU").substring(0, 3).toUpperCase();
    const vNum = `VOUCHER #${prefix}-${Date.now().toString().slice(-6)}`;

    const insertedVoucher = await prisma.$queryRaw<any[]>`
      INSERT INTO tally_vouchers (
        tenant_id, voucher_type, voucher_number, posting_date, narration,
        total_amount, status, requires_hitl
      ) VALUES (
        ${tenantId}::uuid, ${voucherType}, ${vNum}, NOW(), ${narration || ""},
        ${numAmount}, ${status}, ${requiresHitl}
      )
      RETURNING *
    `;

    const vId = insertedVoucher[0].id;

    await prisma.$executeRaw`
      INSERT INTO tally_voucher_entries (
        tenant_id, voucher_id, ledger_id, cost_center_id, debit_amount, credit_amount, fx_rate, bill_reference_type, bill_number
      ) VALUES (
        ${tenantId}::uuid, ${vId}::uuid, ${debitLedgerId}::uuid, ${costCenterId || null}, ${numAmount}, 0.00, 1.0000, ${billReferenceType || 'NEW_REF'}, ${billNumber || 'REF-' + Date.now().toString().slice(-4)}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO tally_voucher_entries (
        tenant_id, voucher_id, ledger_id, cost_center_id, debit_amount, credit_amount, fx_rate, bill_reference_type, bill_number
      ) VALUES (
        ${tenantId}::uuid, ${vId}::uuid, ${creditLedgerId}::uuid, ${costCenterId || null}, 0.00, ${numAmount}, 1.0000, ${billReferenceType || 'NEW_REF'}, ${billNumber || 'REF-' + Date.now().toString().slice(-4)}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO tally_mca_edit_logs (
        tenant_id, voucher_id, action_type, timestamp, user_id, ip_address, field_changes_json
      ) VALUES (
        ${tenantId}::uuid, ${vId}::uuid, 'CREATE', NOW(), 'usr-governance-director', '127.0.0.1',
        ${JSON.stringify({ voucherNumber: vNum, totalAmount: numAmount, voucherType })}
      )
    `;

    if (!requiresHitl) {
      await prisma.$executeRaw`
        UPDATE tally_chart_of_accounts
        SET current_balance = current_balance + ${numAmount}
        WHERE id = ${debitLedgerId}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      await prisma.$executeRaw`
        UPDATE tally_chart_of_accounts
        SET current_balance = current_balance - ${numAmount}
        WHERE id = ${creditLedgerId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: vId,
        voucherNumber: vNum,
        voucherType,
        postingDate: new Date().toISOString(),
        narration: narration || "",
        totalAmount: numAmount,
        status,
        requiresHitl,
        isOptional: false,
        isReversing: false,
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
        code: "TALLY_VOUCHER_CREATE_ERROR",
        message: safeErrorMessage(err, "Failed to record double-entry voucher"),
      },
      meta: null,
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureTallyTables();
    const tenantId = ACTIVE_TENANT_ID;
    const body = await request.json();
    const { voucherId, action } = body;

    if (!voucherId || !action) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_ACTION", message: "Voucher ID and Action required" },
        meta: null,
      }, { status: 400 });
    }

    const newStatus = action === "AUTHORIZE" ? "POSTED" : "CANCELLED";

    await prisma.$executeRaw`
      UPDATE tally_vouchers
      SET status = ${newStatus}, requires_hitl = false
      WHERE id = ${voucherId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    await prisma.$executeRaw`
      INSERT INTO tally_mca_edit_logs (
        tenant_id, voucher_id, action_type, timestamp, user_id, ip_address, field_changes_json
      ) VALUES (
        ${tenantId}::uuid, ${voucherId}::uuid, ${action === 'AUTHORIZE' ? 'ALTER' : 'CANCEL'}, NOW(), 'usr-governance-director', '127.0.0.1',
        ${JSON.stringify({ status: newStatus, action })}
      )
    `;

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
    return NextResponse.json({
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
    }, { status: 500 });
  }
}
