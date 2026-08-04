import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const model = (prisma as any).unitHandover;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { requiresHitl: true, status: "PENDING_APPROVAL" },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM unit_handovers
          WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND requires_hitl = true AND status = 'PENDING_APPROVAL'
          ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      handoverReference: r.handoverReference || r.handover_reference || "",
      unitName: r.unitName || r.unit_name || "",
      buyerName: r.buyerName || r.buyer_name || "",
      desnaggingCompletionPct: Number(r.desnaggingCompletionPct ?? r.desnagging_completion_pct ?? 0),
      financialNocCleared: Boolean(r.financialNocCleared ?? r.financial_noc_cleared),
      outstandingBalance: Number(r.outstandingBalance ?? r.outstanding_balance ?? 0),
      targetHandoverDate: r.targetHandoverDate ? new Date(r.targetHandoverDate).toISOString().split("T")[0] : "",
      requiresHitl: Boolean(r.requiresHitl ?? r.requires_hitl),
      status: r.status,
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
        code: "PENDING_FACILITY_APPROVALS_ERROR",
        message: err instanceof Error ? err.message : "Pending facility approvals could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

