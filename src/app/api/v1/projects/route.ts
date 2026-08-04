import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const projects = await prisma.masterProject.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { createdAt: "desc" },
      include: {
        units: {
          select: {
            towerName: true,
          },
        },
      },
    });

    const mapped = projects.map((p) => {
      const towersSet = new Set(p.units.map((u) => u.towerName));
      const towers = Array.from(towersSet);

      return {
        id: p.id,
        projectCode: p.projectCode,
        projectName: p.projectName,
        location: p.location,
        totalAreaSqft: Number(p.totalAreaSqft),
        totalBudget: Number(p.totalBudget),
        status: p.status,
        towers,
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
        code: "DB_FETCH_PROJECTS_ERROR",
        message: err instanceof Error ? err.message : "Project register is temporarily unavailable",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectCode, projectName, location, totalAreaSqft, totalBudget, startDate, expectedCompletionDate } = body;
  const tenantId = ACTIVE_TENANT_ID;

  if (!projectName || !location || !totalAreaSqft || !totalBudget || !expectedCompletionDate) {
    return NextResponse.json({
      success: false,
      status_code: 400,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "INCOMPLETE_PROJECT_RECORD",
        message: "Project name, location, saleable area, sanctioned budget and target completion date are required",
      },
    });
  }

  try {
    const created = await prisma.masterProject.create({
      data: {
        tenantId,
        projectCode: projectCode || `PRJ-${Date.now().toString().slice(-6)}`,
        projectName,
        location,
        totalAreaSqft: Number(totalAreaSqft),
        totalBudget: Number(totalBudget),
        status: "ACTIVE",
        startDate: startDate ? new Date(startDate) : new Date(),
        expectedCompletionDate: new Date(expectedCompletionDate),
      },
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        projectCode: created.projectCode,
        projectName: created.projectName,
        location: created.location,
        totalAreaSqft: Number(created.totalAreaSqft),
        totalBudget: Number(created.totalBudget),
        status: created.status,
        towers: [],
      },
      error: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "DB_CREATE_PROJECT_ERROR",
        message: err instanceof Error ? err.message : "Project could not be saved",
      },
    });
  }
}
