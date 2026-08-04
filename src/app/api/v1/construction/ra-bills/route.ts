import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { HITL_RA_BILL_LIMIT, RA_BILL_PROGRESS_REVIEW_PCT } from "@/lib/governance";

const isUuid = (val: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const billModel = (prisma as any).contractorRaBill;
    let bills: any[] = [];

    if (billModel?.findMany) {
      const where: any = {};
      if (projectId && projectId !== "All" && projectId !== "All Nashik Developments") {
        if (isUuid(projectId)) {
          where.OR = [
            { projectId },
            { project: { projectName: { contains: projectId, mode: "insensitive" } } },
          ];
        } else {
          where.project = { projectName: { contains: projectId, mode: "insensitive" } };
        }
      }
      bills = await billModel.findMany({
        where,
        include: { project: true },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT b.*, p.project_name
          FROM contractor_ra_bills b
          LEFT JOIN master_project p ON b.project_id = p.id
          WHERE b.tenant_id = ${ACTIVE_TENANT_ID}::uuid
        `;
        bills = raw.map((r: any) => ({
          id: r.id,
          billReference: r.bill_reference,
          contractorName: r.contractor_name,
          wbsPhase: r.wbs_phase,
          grossClaimAmount: r.gross_claim_amount,
          verifiedAmount: r.verified_amount,
          retainedHoldbackAmount: r.retained_holdback_amount,
          gstAmount: r.gst_amount,
          netPayableAmount: r.net_payable_amount,
          claimedProgressPct: r.claimed_progress_pct,
          verifiedProgressPct: r.verified_progress_pct,
          requiresHitl: r.requires_hitl,
          status: r.status,
          project: { projectName: r.project_name },
          projectId: r.project_id,
        }));
      } catch {
        bills = [];
      }
    }

    const mapped = (bills || []).map((b: any) => ({
      id: b.id,
      billReference: b.billReference || b.bill_reference,
      contractorName: b.contractorName || b.contractor_name,
      wbsPhase: b.wbsPhase || b.wbs_phase,
      grossClaimLakhs: Number((Number(b.grossClaimAmount ?? b.gross_claim_amount ?? 0) / 100000).toFixed(2)),
      verifiedLakhs: Number((Number(b.verifiedAmount ?? b.verified_amount ?? 0) / 100000).toFixed(2)),
      retainedHoldbackLakhs: Number((Number(b.retainedHoldbackAmount ?? b.retained_holdback_amount ?? 0) / 100000).toFixed(2)),
      gstLakhs: Number((Number(b.gstAmount ?? b.gst_amount ?? 0) / 100000).toFixed(2)),
      netPayableLakhs: Number((Number(b.netPayableAmount ?? b.net_payable_amount ?? 0) / 100000).toFixed(2)),
      claimedProgressPct: Number(b.claimedProgressPct ?? b.claimed_progress_pct ?? 0),
      verifiedProgressPct: Number(b.verifiedProgressPct ?? b.verified_progress_pct ?? 0),
      requiresHitl: Boolean(b.requiresHitl ?? b.requires_hitl),
      status: b.status,
      projectName: b.project?.projectName || b.project_name || "",
      projectId: b.projectId || b.project_id || "",
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
        code: "RA_BILLS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Contractor RA Bills could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, contractorName, wbsPhase, grossClaimLakhs, claimedProgressPct } = body;
    const tenantId = ACTIVE_TENANT_ID;

    let project = null;
    if (projectId && projectId !== "All Nashik Developments" && projectId !== "All") {
      if (isUuid(projectId)) {
        project = await prisma.masterProject.findFirst({
          where: { tenantId: ACTIVE_TENANT_ID, OR: [{ id: projectId }, { projectName: { contains: projectId, mode: "insensitive" } }] },
        });
      } else {
        project = await prisma.masterProject.findFirst({
          where: { tenantId: ACTIVE_TENANT_ID, projectName: { contains: projectId, mode: "insensitive" } },
        });
      }
    }

    if (!project) {
      project = await prisma.masterProject.findFirst({ where: { tenantId: ACTIVE_TENANT_ID } });
    }

    if (!project) {
      return NextResponse.json({
        success: false,
        status_code: 422,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "NO_PROJECT_FOUND",
          message: "Register a development project before submitting contractor bills",
        },
        meta: null,
      });
    }

    const targetProjectId = project.id;
    const rawInput = Number(grossClaimLakhs || body.amount || body.billAmount || body.claimAmount || body.totalAmount || body.claimedAmount || 0);
    const grossAmount = rawInput > 1000 ? rawInput : rawInput * 100000;
    const holdback = grossAmount * 0.05;
    const netBeforeGst = grossAmount - holdback;
    const gst = netBeforeGst * 0.18;
    const netPayable = netBeforeGst + gst;
    const claimedProgress = Number(claimedProgressPct || 0);

    const billModel = (prisma as any).contractorRaBill;
    const billRef = `RA-BILL-${Date.now().toString().slice(-6)}`;
    const requiresHitl = grossAmount > HITL_RA_BILL_LIMIT || claimedProgress > RA_BILL_PROGRESS_REVIEW_PCT;
    const status = requiresHitl ? "PENDING_APPROVAL" : "APPROVED";

    let createdBill: any = null;

    if (billModel?.create) {
      createdBill = await billModel.create({
        data: {
          tenantId,
          projectId: targetProjectId,
          billReference: billRef,
          contractorName: contractorName || "Contractor Entity",
          wbsPhase: wbsPhase || "General Construction",
          grossClaimAmount: grossAmount,
          verifiedAmount: grossAmount,
          retainedHoldbackAmount: holdback,
          gstAmount: gst,
          netPayableAmount: netPayable,
          claimedProgressPct: claimedProgress,
          verifiedProgressPct: claimedProgress,
          requiresHitl,
          status,
        },
        include: { project: true },
      });
    } else {
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO contractor_ra_bills (
          id, tenant_id, project_id, bill_reference, contractor_name, wbs_phase,
          gross_claim_amount, verified_amount, retained_holdback_amount, gst_amount,
          net_payable_amount, claimed_progress_pct, verified_progress_pct, requires_hitl,
          status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${tenantId}::uuid, ${targetProjectId}::uuid, ${billRef},
          ${contractorName || "Contractor Entity"}, ${wbsPhase || "General Construction"},
          ${grossAmount}, ${grossAmount}, ${holdback}, ${gst}, ${netPayable},
          ${claimedProgress}, ${claimedProgress}, ${requiresHitl}, ${status},
          NOW(), NOW()
        )
        RETURNING *
      `;
      createdBill = inserted[0];
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: createdBill.id,
        billReference: createdBill.billReference || createdBill.bill_reference,
        contractorName: createdBill.contractorName || createdBill.contractor_name,
        wbsPhase: createdBill.wbsPhase || createdBill.wbs_phase,
        grossClaimLakhs: Number((Number(createdBill.grossClaimAmount ?? createdBill.gross_claim_amount ?? 0) / 100000).toFixed(2)),
        verifiedLakhs: Number((Number(createdBill.verifiedAmount ?? createdBill.verified_amount ?? 0) / 100000).toFixed(2)),
        retainedHoldbackLakhs: Number((Number(createdBill.retainedHoldbackAmount ?? createdBill.retained_holdback_amount ?? 0) / 100000).toFixed(2)),
        gstLakhs: Number((Number(createdBill.gstAmount ?? createdBill.gst_amount ?? 0) / 100000).toFixed(2)),
        netPayableLakhs: Number((Number(createdBill.netPayableAmount ?? createdBill.net_payable_amount ?? 0) / 100000).toFixed(2)),
        claimedProgressPct: Number(createdBill.claimedProgressPct ?? createdBill.claimed_progress_pct ?? 0),
        verifiedProgressPct: Number(createdBill.verifiedProgressPct ?? createdBill.verified_progress_pct ?? 0),
        requiresHitl: Boolean(createdBill.requiresHitl ?? createdBill.requires_hitl),
        status: createdBill.status,
        projectName: project.projectName,
        projectId: targetProjectId,
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
        code: "RA_BILL_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Contractor RA Bill could not be saved",
      },
      meta: null,
    });
  }
}


