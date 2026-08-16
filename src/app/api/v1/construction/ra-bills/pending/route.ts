import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;

    const pendingBills = await prisma.contractorRaBill.findMany({
      where: {
        tenantId,
        status: "PENDING_APPROVAL",
      },
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
            projectCode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = pendingBills.map((b) => ({
      id: b.id,
      billReference: b.billReference,
      contractorName: b.contractorName,
      wbsPhase: b.wbsPhase,
      grossClaimLakhs: Number((Number(b.grossClaimAmount) / 100000).toFixed(2)),
      verifiedLakhs: Number((Number(b.verifiedAmount) / 100000).toFixed(2)),
      retainedHoldbackLakhs: Number((Number(b.retainedHoldbackAmount) / 100000).toFixed(2)),
      gstLakhs: Number((Number(b.gstAmount) / 100000).toFixed(2)),
      netPayableLakhs: Number((Number(b.netPayableAmount) / 100000).toFixed(2)),
      claimedProgressPct: Number(b.claimedProgressPct),
      verifiedProgressPct: Number(b.verifiedProgressPct),
      requiresHitl: b.requiresHitl,
      status: b.status,
      rejectionReason: b.rejectionReason,
      projectName: b.project?.projectName || "",
      projectId: b.projectId,
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
        message: safeErrorMessage(err, "Pending RA Bills could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}


