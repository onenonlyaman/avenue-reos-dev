import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const billModel = (prisma as any).contractorRaBill;
    let pendingBills: any[] = [];

    if (billModel?.findMany) {
      pendingBills = await billModel.findMany({
        where: { status: "PENDING_APPROVAL" },
        include: { project: true },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT b.*, p.project_name
          FROM contractor_ra_bills b
          LEFT JOIN master_project p ON b.project_id = p.id
          WHERE b.tenant_id = ${ACTIVE_TENANT_ID}::uuid AND b.status = 'PENDING_APPROVAL'
          ORDER BY b.created_at DESC
        `;
        pendingBills = raw.map((r: any) => ({
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
        pendingBills = [];
      }
    }

    const mapped = (pendingBills || []).map((b: any) => ({
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
        code: "PENDING_RA_BILLS_ERROR",
        message: err instanceof Error ? err.message : "Pending RA Bills could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

