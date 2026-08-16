import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureJdaContractsTable } from "@/lib/legalDb";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

  try {
    await ensureJdaContractsTable();

    const model = (prisma as any).jdaContract;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    } else {
      const raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM jda_contracts
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY created_at DESC
      `;
      records = raw || [];
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      agreementReference: r.agreementReference || r.agreement_reference || "",
      landownerName: r.landownerName || r.landowner_name || "",
      projectSite: r.projectSite || r.project_site || "",
      developerSharePct: Number(r.developerSharePct ?? r.developer_share_pct ?? 0),
      landownerSharePct: Number(r.landownerSharePct ?? r.landowner_share_pct ?? 0),
      escrowAccountStatus: r.escrowAccountStatus || r.escrow_account_status || "ACTIVE",
      contractStatus: r.contractStatus || r.contract_status || "ACTIVE",
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
        code: "JDAS_FETCH_ERROR",
        message: safeErrorMessage(err, "JDA contracts could not be loaded"),
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
    const landownerName = (body.landownerName || "").trim();
    const projectSite = (body.projectSite || "").trim();
    const { developerSharePct, landownerSharePct } = body;
    const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

    if (!landownerName || !projectSite) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Landowner name and project development site are required." },
        meta: null,
      }, { status: 400 });
    }

    const devShare = Number(developerSharePct);
    const ownerShare = Number(landownerSharePct);

    if (!Number.isFinite(devShare) || devShare < 0 || devShare > 100) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_DEV_SHARE", message: "Developer allocation share must be between 0% and 100%." },
        meta: null,
      }, { status: 400 });
    }

    if (!Number.isFinite(ownerShare) || ownerShare < 0 || ownerShare > 100) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_OWNER_SHARE", message: "Landowner allocation share must be between 0% and 100%." },
        meta: null,
      }, { status: 400 });
    }

    if (Math.abs(devShare + ownerShare - 100) > 0.01) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INVALID_SHARE_SPLIT",
          message: `Developer share (${devShare}%) and Landowner share (${ownerShare}%) must sum to exactly 100%.`,
        },
        meta: null,
      }, { status: 400 });
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ref = `JDA-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    await ensureJdaContractsTable();

    const model = (prisma as any).jdaContract;
    let created: any = null;

    if (model?.create) {
      created = await model.create({
        data: {
          tenantId,
          agreementReference: ref,
          landownerName,
          projectSite,
          developerSharePct: devShare,
          landownerSharePct: ownerShare,
          escrowAccountStatus: "ACTIVE",
          contractStatus: "ACTIVE",
        },
      });
    } else {
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO jda_contracts (
          tenant_id, agreement_reference, landowner_name, project_site,
          developer_share_pct, landowner_share_pct, escrow_account_status, contract_status
        ) VALUES (
          ${tenantId}::uuid, ${ref}, ${landownerName}, ${projectSite},
          ${devShare}, ${ownerShare}, 'ACTIVE', 'ACTIVE'
        )
        RETURNING *
      `;
      created = inserted[0];
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        agreementReference: created.agreementReference || created.agreement_reference,
        landownerName: created.landownerName || created.landowner_name,
        projectSite: created.projectSite || created.project_site,
        developerSharePct: Number(created.developerSharePct ?? created.developer_share_pct ?? devShare),
        landownerSharePct: Number(created.landownerSharePct ?? created.landowner_share_pct ?? ownerShare),
        escrowAccountStatus: created.escrowAccountStatus || created.escrow_account_status || "ACTIVE",
        contractStatus: created.contractStatus || created.contract_status || "ACTIVE",
        createdAt: created.createdAt || created.created_at,
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
        code: "JDA_CREATE_ERROR",
        message: safeErrorMessage(err, "Joint Development Agreement could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}



