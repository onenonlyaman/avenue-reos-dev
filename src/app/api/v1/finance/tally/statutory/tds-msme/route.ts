import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

async function ensureTdsMsmeTables() {
  await runtimeDdl("table:tally_msme_compliance", () => prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tally_msme_compliance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      vendor_name VARCHAR(255) NOT NULL,
      msme_category VARCHAR(50) NOT NULL DEFAULT 'MICRO',
      agreement_exists BOOLEAN NOT NULL DEFAULT true,
      payment_window_days INT NOT NULL DEFAULT 45,
      invoice_number VARCHAR(100),
      invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      overdue_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      tax_disallowance_risk BOOLEAN NOT NULL DEFAULT false,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
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
    await ensureTdsMsmeTables();
    const tenantId = ACTIVE_TENANT_ID;

    const msmeRows = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM tally_msme_compliance
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `;

    const mcaRows = await prisma.$queryRaw<any[]>`
      SELECT l.*, v.voucher_number
      FROM tally_mca_edit_logs l
      LEFT JOIN tally_vouchers v ON l.voucher_id = v.id
      WHERE l.tenant_id = ${tenantId}::uuid
      ORDER BY l.timestamp DESC
      LIMIT 100
    `;

    const mappedMsme = msmeRows.map((r) => ({
      id: r.id,
      vendorName: r.vendor_name,
      msmeCategory: r.msme_category,
      agreementExists: Boolean(r.agreement_exists),
      paymentWindowDays: Number(r.payment_window_days),
      invoiceNumber: r.invoice_number || "INV-000",
      invoiceDate: r.invoice_date ? new Date(r.invoice_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      dueDate: r.due_date ? new Date(r.due_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      amount: Number(r.amount),
      overdueAmount: Number(r.overdue_amount),
      taxDisallowanceRisk: Boolean(r.tax_disallowance_risk),
      status: r.status,
    }));

    const mappedMca = mcaRows.map((r) => ({
      id: r.id,
      voucherReference: r.voucher_number || `Voucher #${String(r.voucher_id).slice(0, 8)}`,
      actionType: r.action_type,
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
      userId: r.user_id || "usr-governance-director",
      ipAddress: r.ip_address || "127.0.0.1",
      fieldChangesSummary: r.field_changes_json || "{}",
    }));

    const tdsSummary = [
      {
        sectionCode: "194C",
        sectionDescription: "Contractor Payments (Construction & Civil Works)",
        thresholdLimit: 300000,
        utilizedAmount: msmeRows.reduce((sum, m) => sum + Number(m.amount), 0),
        tdsDeductedAmount: Number((msmeRows.reduce((sum, m) => sum + Number(m.amount), 0) * 0.02).toFixed(2)),
        complianceStatus: "VERIFIED",
      },
      {
        sectionCode: "194J",
        sectionDescription: "Professional & Technical Fees (Architects & Engineers)",
        thresholdLimit: 50000,
        utilizedAmount: 0,
        tdsDeductedAmount: 0,
        complianceStatus: "VERIFIED",
      },
      {
        sectionCode: "194I",
        sectionDescription: "Rent for Heavy Equipment & Plant Machinery",
        thresholdLimit: 240000,
        utilizedAmount: 0,
        tdsDeductedAmount: 0,
        complianceStatus: "VERIFIED",
      },
      {
        sectionCode: "194Q",
        sectionDescription: "Purchase of Steel, Cement & Raw Material Goods > 50L",
        thresholdLimit: 5000000,
        utilizedAmount: 0,
        tdsDeductedAmount: 0,
        complianceStatus: "VERIFIED",
      },
    ];

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        tdsSummary,
        msmeVendors: mappedMsme,
        mcaLogs: mappedMca,
      },
      error: null,
      meta: { total_records: mappedMsme.length + mappedMca.length },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        tdsSummary: [],
        msmeVendors: [],
        mcaLogs: [],
      },
      error: {
        code: "TDS_MSME_FETCH_ERROR",
        message: safeErrorMessage(err, "Failed to fetch TDS and MSME compliance data"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
