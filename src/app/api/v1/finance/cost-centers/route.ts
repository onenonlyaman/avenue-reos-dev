import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { LAKH_IN_RUPEES } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const costCenters = await prisma.masterCostCenter.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { costCenterCode: "asc" },
      include: { project: true },
    });

    const mapped = costCenters.map((cc) => ({
      id: cc.id,
      costCenterCode: cc.costCenterCode,
      name: cc.name,
      projectName: cc.project?.projectName || "Unassigned Project",
      allocatedBudgetLakhs: Number((Number(cc.allocatedBudget) / LAKH_IN_RUPEES).toFixed(2)),
      formattedLabel: `${cc.costCenterCode} (${cc.name})`,
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
        code: "FETCH_COST_CENTERS_ERROR",
        message: safeErrorMessage(err, "Cost centre register is temporarily unavailable"),
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
    const { costCenterCode, name, projectId, allocatedBudgetLakhs } = body;

    if (!costCenterCode || !name || !allocatedBudgetLakhs) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_COST_CENTRE_RECORD",
          message: "Cost centre code, name and allocated budget are required",
        },
        meta: null,
      }, { status: 400 });
    }

    const created = await prisma.masterCostCenter.create({
      data: {
        tenantId: ACTIVE_TENANT_ID,
        costCenterCode,
        name,
        projectId: projectId || null,
        allocatedBudget: Number(allocatedBudgetLakhs) * LAKH_IN_RUPEES,
        status: "ACTIVE",
      },
      include: { project: true },
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        costCenterCode: created.costCenterCode,
        name: created.name,
        projectName: created.project?.projectName || "Unassigned Project",
        allocatedBudgetLakhs: Number(allocatedBudgetLakhs),
        formattedLabel: `${created.costCenterCode} (${created.name})`,
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
        code: "COST_CENTRE_CREATE_ERROR",
        message: safeErrorMessage(err, "Cost centre could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}

