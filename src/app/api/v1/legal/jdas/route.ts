import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const model = (prisma as any).jdaContract;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM jda_contracts WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      agreementReference: r.agreementReference || r.agreement_reference || "",
      landownerName: r.landownerName || r.landowner_name || "",
      projectSite: r.projectSite || r.project_site || "",
      developerSharePct: Number(r.developerSharePct ?? r.developer_share_pct ?? 65),
      landownerSharePct: Number(r.landownerSharePct ?? r.landowner_share_pct ?? 35),
      escrowAccountStatus: r.escrowAccountStatus || r.escrow_account_status || "ACTIVE",
      contractStatus: r.contractStatus || r.contract_status || "ACTIVE",
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
        message: err instanceof Error ? err.message : "JDA contracts could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { landownerName, projectSite, developerSharePct, landownerSharePct } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!landownerName || !projectSite) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Landowner name and project site are required." },
        meta: null,
      });
    }

    const devShare = Number(developerSharePct || 65);
    const ownerShare = Number(landownerSharePct || 35);
    const ref = `JDA-${Date.now().toString().slice(-6)}`;

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
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS jda_contracts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            agreement_reference VARCHAR(100) NOT NULL,
            landowner_name VARCHAR(255) NOT NULL,
            project_site VARCHAR(255) NOT NULL,
            developer_share_pct DECIMAL(5,2) NOT NULL,
            landowner_share_pct DECIMAL(5,2) NOT NULL,
            escrow_account_status VARCHAR(50) NOT NULL,
            contract_status VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
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
      } catch (err: unknown) {
        throw new Error(err instanceof Error ? err.message : "Joint development agreement could not be saved");
      }
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
        code: "JDA_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Joint Development Agreement could not be saved",
      },
      meta: null,
    });
  }
}



