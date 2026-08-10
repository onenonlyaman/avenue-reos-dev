import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

async function ensureCoA() {
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
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureCoA();
    const tenantId = ACTIVE_TENANT_ID;

    const ledgers = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM tally_chart_of_accounts
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY primary_group ASC, sub_group ASC, ledger_name ASC
    `;

    const mapped = ledgers.map((l) => ({
      id: l.id,
      primaryGroup: l.primary_group,
      subGroup: l.sub_group,
      ledgerName: l.ledger_name,
      ledgerType: l.ledger_type,
      openingBalance: Number(l.opening_balance),
      currentBalance: Number(l.current_balance),
      currencyCode: l.currency_code,
      gstin: l.gstin || "",
      pan: l.pan || "",
    }));

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
        code: "COA_FETCH_ERROR",
        message: safeErrorMessage(err, "Failed to fetch Chart of Accounts"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureCoA();
    const tenantId = ACTIVE_TENANT_ID;
    const body = await request.json();

    const {
      primaryGroup,
      subGroup,
      ledgerName,
      ledgerType,
      openingBalance,
      currencyCode,
      gstin,
      pan,
    } = body;

    if (!primaryGroup || !subGroup || !ledgerName) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INVALID_LEDGER_DATA",
          message: "Primary group, subgroup, and ledger name are required",
        },
        meta: null,
      }, { status: 400 });
    }

    const opBal = Number(openingBalance || 0);

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO tally_chart_of_accounts (
        tenant_id, primary_group, sub_group, ledger_name, ledger_type,
        opening_balance, current_balance, currency_code, gstin, pan
      ) VALUES (
        ${tenantId}::uuid, ${primaryGroup}, ${subGroup}, ${ledgerName}, ${ledgerType || 'BALANCE_SHEET'},
        ${opBal}, ${opBal}, ${currencyCode || 'INR'}, ${gstin || null}, ${pan || null}
      )
      RETURNING *
    `;

    const l = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: l.id,
        primaryGroup: l.primary_group,
        subGroup: l.sub_group,
        ledgerName: l.ledger_name,
        ledgerType: l.ledger_type,
        openingBalance: Number(l.opening_balance),
        currentBalance: Number(l.current_balance),
        currencyCode: l.currency_code,
        gstin: l.gstin || "",
        pan: l.pan || "",
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
        code: "COA_CREATE_ERROR",
        message: safeErrorMessage(err, "Failed to create ledger account"),
      },
      meta: null,
    }, { status: 500 });
  }
}
