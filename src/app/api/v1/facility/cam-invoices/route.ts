import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const model = (prisma as any).camInvoice;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM cam_invoices WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      invoiceReference: r.invoiceReference || r.invoice_reference || "",
      unitName: r.unitName || r.unit_name || "",
      superBuiltupSqft: Number(r.superBuiltupSqft ?? r.super_builtup_sqft ?? 0),
      billingPeriod: r.billingPeriod || r.billing_period || "",
      baseCamAmount: Number(r.baseCamAmount ?? r.base_cam_amount ?? 0),
      gstAmount: Number(r.gstAmount ?? r.gst_amount ?? 0),
      totalDueAmount: Number(r.totalDueAmount ?? r.total_due_amount ?? 0),
      paymentStatus: r.paymentStatus || r.payment_status || "UNPAID",
      issuedDate: r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : "",
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
        code: "CAM_FETCH_ERROR",
        message: safeErrorMessage(err, "CAM invoices could not be loaded"),
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
    const { billingPeriod, ratePerSqft } = body;
    const tenantId = ACTIVE_TENANT_ID;
    const rate = Number(ratePerSqft || 3.5);
    const period = billingPeriod || "Q3 2026";

    const units = await prisma.masterUnit.findMany({ where: { tenantId: ACTIVE_TENANT_ID },
      include: { project: true },
    });

    if (units.length === 0) {
      return NextResponse.json({
        success: false,
        status_code: 422,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "NO_UNITS_FOUND",
          message: "No units on record to raise maintenance invoices against",
        },
        meta: null,
      }, { status: 422 });
    }

    try {
      await runtimeDdl("table:cam_invoices", () => prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS cam_invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          invoice_reference VARCHAR(100) NOT NULL,
          unit_name VARCHAR(255) NOT NULL,
          super_builtup_sqft DECIMAL(15,2) NOT NULL,
          billing_period VARCHAR(50) NOT NULL,
          base_cam_amount DECIMAL(15,2) NOT NULL,
          gst_amount DECIMAL(15,2) NOT NULL,
          total_due_amount DECIMAL(15,2) NOT NULL,
          payment_status VARCHAR(50) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    } catch {
    }

    let generatedCount = 0;
    for (const u of units) {
      const area = Number(u.carpetAreaSqft || 1200) * 1.25;
      const baseCam = area * rate;
      const gst = baseCam * 0.18;
      const totalDue = baseCam + gst;
      const ref = `CAM-${Date.now().toString().slice(-4)}-${generatedCount + 1}`;
      const unitName = `${u.project?.projectName || "Development"} - Unit ${u.unitNumber}`;

      try {
        await prisma.$executeRaw`
          INSERT INTO cam_invoices (
            tenant_id, invoice_reference, unit_name, super_builtup_sqft,
            billing_period, base_cam_amount, gst_amount, total_due_amount, payment_status
          ) VALUES (
            ${tenantId}::uuid, ${ref}, ${unitName}, ${area},
            ${period}, ${baseCam}, ${gst}, ${totalDue}, 'UNPAID'
          )
        `;
        generatedCount++;
      } catch {
      }
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, generatedCount },
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
        code: "CAM_GENERATE_ERROR",
        message: safeErrorMessage(err, "CAM invoices could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}



