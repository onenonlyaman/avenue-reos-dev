import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const records = await prisma.unitHandover.findMany({
      where: {
        tenantId: ACTIVE_TENANT_ID,
        requiresHitl: true,
        status: "PENDING_APPROVAL",
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = records.map((r) => ({
      id: r.id,
      handoverReference: r.handoverReference,
      unitName: r.unitName,
      buyerName: r.buyerName,
      desnaggingCompletionPct: Number(r.desnaggingCompletionPct),
      financialNocCleared: r.financialNocCleared,
      outstandingBalance: Number(r.outstandingBalance),
      targetHandoverDate: r.targetHandoverDate ? new Date(r.targetHandoverDate).toISOString().split("T")[0] : "",
      requiresHitl: r.requiresHitl,
      status: r.status,
      rejectionReason: r.rejectionReason || null,
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
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: [],
        error: {
          code: "PENDING_FACILITY_APPROVALS_ERROR",
          message: safeErrorMessage(err, "Pending facility approvals could not be loaded"),
        },
        meta: { total_records: 0 },
      },
      { status: 500 }
    );
  }
}
