import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { LAKH_IN_RUPEES } from "@/lib/governance";

async function ensureReraComplianceRegister() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS rera_compliances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      project_name VARCHAR(255) NOT NULL,
      rera_reg_reference VARCHAR(100) NOT NULL,
      quarterly_return_status VARCHAR(50) NOT NULL DEFAULT 'COMPLIANT',
      escrow_balance_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      form1_status BOOLEAN NOT NULL DEFAULT false,
      form2_status BOOLEAN NOT NULL DEFAULT false,
      form3_status BOOLEAN NOT NULL DEFAULT false,
      certificate_audit_status VARCHAR(100) NOT NULL DEFAULT 'Compliant',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    const model = (prisma as any).reraCompliance;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { tenantId: ACTIVE_TENANT_ID },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        await ensureReraComplianceRegister();
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM rera_compliances WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      projectName: r.projectName || r.project_name || "",
      reraRegReference: r.reraRegReference || r.rera_reg_reference || "",
      quarterlyReturnStatus: r.quarterlyReturnStatus || r.quarterly_return_status || "COMPLIANT",
      escrowBalanceLakhs: Number(
        (Number(r.escrowBalanceAmount ?? r.escrow_balance_amount ?? 0) / LAKH_IN_RUPEES).toFixed(2)
      ),
      form1Status: Boolean(r.form1Status ?? r.form1_status),
      form2Status: Boolean(r.form2Status ?? r.form2_status),
      form3Status: Boolean(r.form3Status ?? r.form3_status),
      certificateAuditStatus: r.certificateAuditStatus || r.certificate_audit_status || "Compliant",
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
        code: "RERA_FETCH_ERROR",
        message: err instanceof Error ? err.message : "MahaRERA compliance register is temporarily unavailable",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectName,
      reraRegReference,
      quarterlyReturnStatus,
      escrowBalanceLakhs,
      form1Status,
      form2Status,
      form3Status,
      certificateAuditStatus,
    } = body;

    if (!projectName || !reraRegReference) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_RERA_RECORD",
          message: "Development name and MahaRERA registration reference are required",
        },
        meta: null,
      });
    }

    await ensureReraComplianceRegister();

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO rera_compliances (
        tenant_id, project_name, rera_reg_reference, quarterly_return_status, escrow_balance_amount,
        form1_status, form2_status, form3_status, certificate_audit_status
      ) VALUES (
        ${ACTIVE_TENANT_ID}::uuid, ${projectName}, ${reraRegReference}, ${quarterlyReturnStatus || "COMPLIANT"},
        ${(Number(escrowBalanceLakhs) || 0) * LAKH_IN_RUPEES},
        ${Boolean(form1Status)}, ${Boolean(form2Status)}, ${Boolean(form3Status)},
        ${certificateAuditStatus || "Compliant"}
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
        projectName: created.project_name,
        reraRegReference: created.rera_reg_reference,
        quarterlyReturnStatus: created.quarterly_return_status,
        escrowBalanceLakhs: Number((Number(created.escrow_balance_amount) / LAKH_IN_RUPEES).toFixed(2)),
        form1Status: Boolean(created.form1_status),
        form2Status: Boolean(created.form2_status),
        form3Status: Boolean(created.form3_status),
        certificateAuditStatus: created.certificate_audit_status,
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
        code: "RERA_CREATE_ERROR",
        message: err instanceof Error ? err.message : "MahaRERA compliance record could not be registered",
      },
      meta: null,
    });
  }
}
