import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { HITL_DISBURSEMENT_LIMIT } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { amount, disbursementAmount, payeeName, category, description } = body;
    const tenantId = ACTIVE_TENANT_ID;
    const numAmount = Number(disbursementAmount || amount || 0);

    if (!numAmount) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_VOUCHER_RECORD",
          message: "A disbursement amount is required",
        },
        meta: null,
      }, { status: 400 });
    }

    const requiresHitl = numAmount > HITL_DISBURSEMENT_LIMIT;
    const status = requiresHitl ? "PENDING_APPROVAL" : "POSTED";
    const voucherRef = `VOUCHER-${Date.now().toString().slice(-6)}`;

    await runtimeDdl("table:finance_vouchers", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS finance_vouchers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        voucher_reference VARCHAR(100) NOT NULL,
        payee_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        description TEXT NOT NULL,
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL DEFAULT 'POSTED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO finance_vouchers (
        tenant_id, voucher_reference, payee_name, category, amount, description, requires_hitl, status
      ) VALUES (
        ${tenantId}::uuid, ${voucherRef}, ${payeeName || ""}, ${category || "Disbursement"},
        ${numAmount}, ${description || ""}, ${requiresHitl}, ${status}
      )
      RETURNING *
    `;

    const created = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        voucherReference: created.voucher_reference,
        payeeName: created.payee_name,
        category: created.category,
        amount: Number(created.amount),
        description: created.description,
        requiresHitl: Boolean(created.requires_hitl),
        status: created.status,
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
        code: "VOUCHER_CREATE_ERROR",
        message: safeErrorMessage(err, "Finance voucher could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}


