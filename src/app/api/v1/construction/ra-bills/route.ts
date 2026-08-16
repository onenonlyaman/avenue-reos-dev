import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { HITL_RA_BILL_LIMIT, RA_BILL_PROGRESS_REVIEW_PCT } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

const isUuid = (val: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const tenantId = auth.user.tenantId;

    const where: any = { tenantId };

    if (projectId && projectId !== "All" && projectId !== "All Nashik Developments") {
      if (isUuid(projectId)) {
        where.projectId = projectId;
      } else {
        where.project = { projectName: { contains: projectId, mode: "insensitive" } };
      }
    }

    const bills = await prisma.contractorRaBill.findMany({
      where,
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

    const mapped = bills.map((b) => ({
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
        code: "RA_BILLS_FETCH_ERROR",
        message: safeErrorMessage(err, "Contractor RA Bills could not be loaded"),
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
    const { projectId, contractorName, wbsPhase, grossClaimLakhs, claimedProgressPct } = body;
    const tenantId = auth.user.tenantId;

    if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_PROJECT", message: "A valid development project selection is required" },
        meta: null,
      }, { status: 400 });
    }

    if (!contractorName || typeof contractorName !== "string" || !contractorName.trim()) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_CONTRACTOR", message: "Contractor name is required" },
        meta: null,
      }, { status: 400 });
    }

    if (!wbsPhase || typeof wbsPhase !== "string" || !wbsPhase.trim()) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_WBS_PHASE", message: "Execution scope / WBS phase is required" },
        meta: null,
      }, { status: 400 });
    }

    // Resolve project in current tenant
    let project = null;
    if (isUuid(projectId.trim())) {
      project = await prisma.masterProject.findFirst({
        where: { id: projectId.trim(), tenantId },
      });
    } else {
      project = await prisma.masterProject.findFirst({
        where: { tenantId, projectName: { equals: projectId.trim(), mode: "insensitive" } },
      });
    }

    if (!project) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Selected project was not found in your organization records",
        },
        meta: null,
      }, { status: 404 });
    }

    const inputLakhs = Number(grossClaimLakhs);
    let grossAmount = 0;

    if (!isNaN(inputLakhs) && inputLakhs > 0) {
      grossAmount = Math.round(inputLakhs * 100000 * 100) / 100;
    } else if (body.grossClaimAmount && Number(body.grossClaimAmount) > 0) {
      grossAmount = Math.round(Number(body.grossClaimAmount) * 100) / 100;
    } else {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_AMOUNT", message: "Gross claim amount must be greater than zero" },
        meta: null,
      }, { status: 400 });
    }

    const holdback = Math.round(grossAmount * 0.05 * 100) / 100;
    const netBeforeGst = Math.round((grossAmount - holdback) * 100) / 100;
    const gst = Math.round(netBeforeGst * 0.18 * 100) / 100;
    const netPayable = Math.round((netBeforeGst + gst) * 100) / 100;
    const claimedProgress = Math.max(0, Math.min(100, Number(claimedProgressPct || 0)));

    const randomSuffix = `${Date.now().toString().slice(-6)}`;
    const billRef = `RA-BILL-${randomSuffix}`;
    const requiresHitl = grossAmount > HITL_RA_BILL_LIMIT || claimedProgress > RA_BILL_PROGRESS_REVIEW_PCT;
    const status = requiresHitl ? "PENDING_APPROVAL" : "APPROVED";

    const createdBill = await prisma.contractorRaBill.create({
      data: {
        tenantId,
        projectId: project.id,
        billReference: billRef,
        contractorName: contractorName.trim(),
        wbsPhase: wbsPhase.trim(),
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
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
            projectCode: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: createdBill.id,
        billReference: createdBill.billReference,
        contractorName: createdBill.contractorName,
        wbsPhase: createdBill.wbsPhase,
        grossClaimLakhs: Number((Number(createdBill.grossClaimAmount) / 100000).toFixed(2)),
        verifiedLakhs: Number((Number(createdBill.verifiedAmount) / 100000).toFixed(2)),
        retainedHoldbackLakhs: Number((Number(createdBill.retainedHoldbackAmount) / 100000).toFixed(2)),
        gstLakhs: Number((Number(createdBill.gstAmount) / 100000).toFixed(2)),
        netPayableLakhs: Number((Number(createdBill.netPayableAmount) / 100000).toFixed(2)),
        claimedProgressPct: Number(createdBill.claimedProgressPct),
        verifiedProgressPct: Number(createdBill.verifiedProgressPct),
        requiresHitl: createdBill.requiresHitl,
        status: createdBill.status,
        projectName: project.projectName,
        projectId: project.id,
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
        code: "RA_BILL_CREATE_ERROR",
        message: safeErrorMessage(err, "Contractor RA Bill could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}



