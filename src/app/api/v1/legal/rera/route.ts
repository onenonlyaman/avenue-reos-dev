import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureReraComplianceRegister } from "@/lib/legalDb";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { LAKH_IN_RUPEES } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

  try {
    await ensureReraComplianceRegister();

    const model = (prisma as any).reraCompliance;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    } else {
      const raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM rera_compliances
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY created_at DESC
      `;
      records = raw || [];
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
      createdAt: r.createdAt || r.created_at || new Date().toISOString(),
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
        message: safeErrorMessage(err, "MahaRERA compliance register is temporarily unavailable"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

  try {
    const body = await request.json();
    const projectName = (body.projectName || "").trim();
    const reraRegReference = (body.reraRegReference || "").trim();
    const {
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
          message: "Development name and MahaRERA registration reference are required.",
        },
        meta: null,
      }, { status: 400 });
    }

    const rawEscrow = Number(escrowBalanceLakhs);
    const escrowLakhsVal = Number.isFinite(rawEscrow) && rawEscrow >= 0 ? rawEscrow : 0;
    const escrowRupees = escrowLakhsVal * LAKH_IN_RUPEES;

    const validReturns = ["COMPLIANT", "PENDING", "PENDING_FILING", "OVERDUE"];
    const qReturn = validReturns.includes(quarterlyReturnStatus) ? quarterlyReturnStatus : "COMPLIANT";

    const validCertStatuses = ["Compliant", "Under Review", "Pending Certification", "Overdue Filing", "Lapsed"];
    const certStatus = validCertStatuses.includes(certificateAuditStatus) ? certificateAuditStatus : "Compliant";

    await ensureReraComplianceRegister();

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO rera_compliances (
        tenant_id, project_name, rera_reg_reference, quarterly_return_status, escrow_balance_amount,
        form1_status, form2_status, form3_status, certificate_audit_status
      ) VALUES (
        ${tenantId}::uuid, ${projectName}, ${reraRegReference}, ${qReturn},
        ${escrowRupees},
        ${Boolean(form1Status)}, ${Boolean(form2Status)}, ${Boolean(form3Status)},
        ${certStatus}
      )
      ON CONFLICT (tenant_id, rera_reg_reference) DO UPDATE
      SET project_name = EXCLUDED.project_name,
          quarterly_return_status = EXCLUDED.quarterly_return_status,
          escrow_balance_amount = EXCLUDED.escrow_balance_amount,
          form1_status = EXCLUDED.form1_status,
          form2_status = EXCLUDED.form2_status,
          form3_status = EXCLUDED.form3_status,
          certificate_audit_status = EXCLUDED.certificate_audit_status,
          updated_at = NOW()
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
        createdAt: created.created_at,
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
        code: "RERA_CREATE_ERROR",
        message: safeErrorMessage(err, "MahaRERA compliance record could not be registered"),
      },
      meta: null,
    }, { status: 500 });
  }
}
