import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

async function ensureGstTables() {
  await runtimeDdl("table:tally_gstr_mismatches", () => prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tally_gstr_mismatches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      vendor_name VARCHAR(255) NOT NULL,
      invoice_number VARCHAR(100) NOT NULL,
      invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      portal_itc_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      books_itc_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      variance_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) NOT NULL DEFAULT 'MISMATCH_FLAGGED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureGstTables();
    const tenantId = ACTIVE_TENANT_ID;

    const mismatches = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM tally_gstr_mismatches
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `;

    const mappedMismatches = mismatches.map((m) => ({
      id: m.id,
      vendorName: m.vendor_name,
      invoiceNumber: m.invoice_number,
      invoiceDate: m.invoice_date ? new Date(m.invoice_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      portalItcAmount: Number(m.portal_itc_amount),
      booksItcAmount: Number(m.books_itc_amount),
      varianceAmount: Number(m.variance_amount),
      status: m.status,
    }));

    const salesTotal = mismatches.reduce((acc, m) => acc + Number(m.books_itc_amount), 0);
    const taxLiability = Number((salesTotal * 0.18).toFixed(2));
    const itcAvailable = mismatches.reduce((acc, m) => acc + Number(m.portal_itc_amount), 0);

    const data = {
      gstr1SalesTotal: salesTotal,
      gstr3bTaxLiability: taxLiability,
      gstr2aItcAvailable: itcAvailable,
      itcMismatchCount: mismatches.length,
      eInvoicesGeneratedCount: 0,
      pendingIrnCount: 0,
      mismatches: mappedMismatches,
    };

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data,
      error: null,
      meta: { total_records: mismatches.length },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        gstr1SalesTotal: 0,
        gstr3bTaxLiability: 0,
        gstr2aItcAvailable: 0,
        itcMismatchCount: 0,
        eInvoicesGeneratedCount: 0,
        pendingIrnCount: 0,
        mismatches: [],
      },
      error: {
        code: "GST_SUMMARY_FETCH_ERROR",
        message: safeErrorMessage(err, "Failed to fetch GST summary report"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { invoiceNumber } = body;

    const irn = `IRN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const eWay = `EWB-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        invoiceNumber: invoiceNumber || "INV-2026-001",
        irn,
        eWayBillNumber: eWay,
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
        code: "EINVOICE_GENERATE_ERROR",
        message: safeErrorMessage(err, "Failed to dispatch E-Invoice IRN request"),
      },
      meta: null,
    }, { status: 500 });
  }
}
