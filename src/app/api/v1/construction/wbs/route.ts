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

    const wbsModel = (prisma as any).constructionWbsMilestone;
    let milestones: any[] = [];

    if (wbsModel?.findMany) {
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
      milestones = await wbsModel.findMany({
        where,
        include: { project: true },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT m.*, p.project_name
          FROM construction_wbs_milestones m
          LEFT JOIN master_project p ON m.project_id = p.id
          WHERE m.tenant_id = ${ACTIVE_TENANT_ID}::uuid
        `;
        milestones = raw.map((r: any) => ({
          id: r.id,
          milestoneCode: r.milestone_code,
          executionPhase: r.execution_phase,
          milestoneTitle: r.milestone_title,
          phaseWeightagePct: r.phase_weightage_pct,
          physicalCompletionPct: r.physical_completion_pct,
          targetStartDate: r.target_start_date,
          targetCompletionDate: r.target_completion_date,
          actualCompletionDate: r.actual_completion_date,
          assignedContractor: r.assigned_contractor,
          financialAllocation: r.financial_allocation,
          status: r.status,
          project: { projectName: r.project_name },
          projectId: r.project_id,
        }));
      } catch {
        milestones = [];
      }
    }

    const mapped = (milestones || []).map((m: any) => ({
      id: m.id,
      milestoneCode: m.milestoneCode || m.milestone_code,
      executionPhase: m.executionPhase || m.execution_phase,
      milestoneTitle: m.milestoneTitle || m.milestone_title,
      phaseWeightagePct: Number(m.phaseWeightagePct ?? m.phase_weightage_pct ?? 0),
      physicalCompletionPct: Number(m.physicalCompletionPct ?? m.physical_completion_pct ?? 0),
      targetStartDate: m.targetStartDate ? new Date(m.targetStartDate).toISOString().split("T")[0] : "",
      targetCompletionDate: m.targetCompletionDate ? new Date(m.targetCompletionDate).toISOString().split("T")[0] : "",
      actualCompletionDate: m.actualCompletionDate ? new Date(m.actualCompletionDate).toISOString().split("T")[0] : null,
      assignedContractor: m.assignedContractor || m.assigned_contractor || "",
      financialAllocationLakhs: Number((Number(m.financialAllocation ?? m.financial_allocation ?? 0) / 100000).toFixed(2)),
      status: m.status,
      projectName: m.project?.projectName || m.project_name || "",
      projectId: m.projectId || m.project_id || "",
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

    if (!projectId || !milestoneCode || !executionPhase || !milestoneTitle || !targetStartDate || !targetCompletionDate || !assignedContractor) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_MILESTONE_RECORD",
          message: "Development, milestone reference, phase, title, schedule dates and contractor are required",
        },
        meta: null,
      }, { status: 400 });
    }

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO construction_wbs_milestones (
        id, tenant_id, project_id, milestone_code, execution_phase, milestone_title,
        phase_weightage_pct, physical_completion_pct, target_start_date, target_completion_date,
        assigned_contractor, financial_allocation, status
      ) VALUES (
        gen_random_uuid(), ${ACTIVE_TENANT_ID}::uuid, ${projectId}::uuid, ${milestoneCode}, ${executionPhase}, ${milestoneTitle},
        ${Number(phaseWeightagePct) || 0}, 0, ${new Date(targetStartDate)}, ${new Date(targetCompletionDate)},
        ${assignedContractor}, ${(Number(financialAllocationLakhs) || 0) * LAKH_IN_RUPEES}, 'PENDING'
      )
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
        milestoneCode: created.milestone_code,
        executionPhase: created.execution_phase,
        milestoneTitle: created.milestone_title,
        assignedContractor: created.assigned_contractor,
        status: created.status,
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

