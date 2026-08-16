import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { LAKH_IN_RUPEES } from "@/lib/governance";
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

    const milestones = await prisma.constructionWbsMilestone.findMany({
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

    const mapped = milestones.map((m) => ({
      id: m.id,
      milestoneCode: m.milestoneCode,
      executionPhase: m.executionPhase,
      milestoneTitle: m.milestoneTitle,
      phaseWeightagePct: Number(m.phaseWeightagePct),
      physicalCompletionPct: Number(m.physicalCompletionPct),
      targetStartDate: m.targetStartDate ? new Date(m.targetStartDate).toISOString().split("T")[0] : "",
      targetCompletionDate: m.targetCompletionDate ? new Date(m.targetCompletionDate).toISOString().split("T")[0] : "",
      actualCompletionDate: m.actualCompletionDate ? new Date(m.actualCompletionDate).toISOString().split("T")[0] : null,
      assignedContractor: m.assignedContractor,
      financialAllocationLakhs: Number((Number(m.financialAllocation) / 100000).toFixed(2)),
      status: m.status,
      projectName: m.project?.projectName || "",
      projectId: m.projectId,
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
        code: "WBS_FETCH_ERROR",
        message: safeErrorMessage(err, "WBS milestones could not be loaded"),
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
    const {
      projectId,
      milestoneCode,
      executionPhase,
      milestoneTitle,
      phaseWeightagePct,
      targetStartDate,
      targetCompletionDate,
      assignedContractor,
      financialAllocationLakhs,
    } = body;
    const tenantId = auth.user.tenantId;

    if (!projectId || !milestoneCode || !executionPhase || !milestoneTitle || !targetStartDate || !targetCompletionDate || !assignedContractor) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_MILESTONE_RECORD",
          message: "Development project, milestone reference, execution phase, title, target dates, and contractor are required",
        },
        meta: null,
      }, { status: 400 });
    }

    // Verify project exists in tenant
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
          message: "Selected project was not found in your organization",
        },
        meta: null,
      }, { status: 404 });
    }

    const allocLakhs = Number(financialAllocationLakhs);
    const allocRupees = !isNaN(allocLakhs) && allocLakhs > 0 ? Math.round(allocLakhs * 100000 * 100) / 100 : 0;
    const weightage = Math.max(0, Math.min(100, Number(phaseWeightagePct) || 0));

    const created = await prisma.constructionWbsMilestone.create({
      data: {
        tenantId,
        projectId: project.id,
        milestoneCode: milestoneCode.trim(),
        executionPhase: executionPhase.trim(),
        milestoneTitle: milestoneTitle.trim(),
        phaseWeightagePct: weightage,
        physicalCompletionPct: 0,
        targetStartDate: new Date(targetStartDate),
        targetCompletionDate: new Date(targetCompletionDate),
        assignedContractor: assignedContractor.trim(),
        financialAllocation: allocRupees,
        status: "PENDING",
      },
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
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
        id: created.id,
        milestoneCode: created.milestoneCode,
        executionPhase: created.executionPhase,
        milestoneTitle: created.milestoneTitle,
        assignedContractor: created.assignedContractor,
        status: created.status,
        financialAllocationLakhs: Number((Number(created.financialAllocation) / 100000).toFixed(2)),
        projectName: created.project.projectName,
        projectId: created.projectId,
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
        code: "MILESTONE_CREATE_ERROR",
        message: safeErrorMessage(err, "Work breakdown milestone could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}


