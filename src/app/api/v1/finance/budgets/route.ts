import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { ACTIVE_FISCAL_YEAR, LAKH_IN_RUPEES } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const dbBudgets = await prisma.budgetHead.findMany({ where: { tenantId: ACTIVE_TENANT_ID },
      include: {
        costCenter: {
          include: {
            project: true,
          },
        },
      },
    });

    const mapped = dbBudgets.map((b) => {
      const allocated = Number(b.allocatedAmount) / LAKH_IN_RUPEES;
      const spent = Number(b.actualSpentAmount) / LAKH_IN_RUPEES;
      const variance = allocated > 0 ? (spent / allocated) * 100 : 0;
      const status = variance > 95 ? "OVERRUN" : variance >= 80 ? "WARNING" : "NORMAL";

      return {
        id: b.id,
        costCenterCode: b.budgetCode,
        projectName: b.costCenter?.project?.projectName ? `${b.costCenter.project.projectName} - ${b.costCenter.project.location}` : b.costCenter?.name || "Unassigned Project",
        category: b.costCenter?.name || "",
        totalBudgetLakhs: Number(allocated.toFixed(2)),
        committedPoLakhs: Number((Number(b.committedAmount) / LAKH_IN_RUPEES).toFixed(2)),
        actualDisbursedLakhs: Number(spent.toFixed(2)),
        variancePercentage: Number(variance.toFixed(1)),
        status: status as "NORMAL" | "WARNING" | "OVERRUN",
      };
    });

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
        code: "DB_FETCH_BUDGETS_ERROR",
        message: safeErrorMessage(err, "Budgets could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { budgetCode, costCenterId, totalBudgetLakhs, fiscalYear } = body;

  if (!budgetCode || !costCenterId || !totalBudgetLakhs) {
    return NextResponse.json({
      success: false,
      status_code: 400,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "INCOMPLETE_BUDGET_RECORD",
        message: "Budget reference, cost centre and allocated amount are required",
      },
      meta: null,
    }, { status: 400 });
  }

  const numLakhs = Number(totalBudgetLakhs);

  try {
    const costCenter = await prisma.masterCostCenter.findFirst({
      where: { tenantId: ACTIVE_TENANT_ID, id: costCenterId },
      include: { project: true },
    });

    if (!costCenter) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "COST_CENTRE_NOT_FOUND",
          message: "The selected cost centre is not on record",
        },
        meta: null,
      }, { status: 404 });
    }

    const created = await prisma.budgetHead.create({
      data: {
        tenantId: ACTIVE_TENANT_ID,
        budgetCode,
        costCenterId: costCenter.id,
        allocatedAmount: numLakhs * LAKH_IN_RUPEES,
        committedAmount: 0,
        actualSpentAmount: 0,
        fiscalYear: fiscalYear || ACTIVE_FISCAL_YEAR,
        status: "ACTIVE",
      },
    });

    const newBudget = {
      id: created.id,
      costCenterCode: created.budgetCode,
      projectName: costCenter.project?.projectName || "Unassigned Project",
      category: costCenter.name,
      totalBudgetLakhs: numLakhs,
      committedPoLakhs: 0,
      actualDisbursedLakhs: 0,
      variancePercentage: 0,
      status: "NORMAL" as const,
    };

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: newBudget,
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
        code: "DB_CREATE_BUDGET_ERROR",
        message: safeErrorMessage(err, "Budget allocation could not be saved"),
      },
    }, { status: 500 });
  }
}

