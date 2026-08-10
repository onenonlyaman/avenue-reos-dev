import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const wbsModel = (prisma as any).constructionWbsMilestone;
    let wbsPhases: string[] = [];

    if (wbsModel?.findMany) {
      const wbsWhere: any = {};
      if (projectId && projectId !== "All") {
        wbsWhere.OR = [
          { projectId },
          { project: { projectName: { contains: projectId, mode: "insensitive" } } },
        ];
      }
      const milestones = await wbsModel.findMany({
        where: wbsWhere,
        select: { executionPhase: true },
        distinct: ["executionPhase"],
        orderBy: { executionPhase: "asc" },
      });
      wbsPhases = milestones.map((m: any) => m.executionPhase);
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT DISTINCT execution_phase FROM construction_wbs_milestones WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY execution_phase ASC
        `;
        wbsPhases = raw.map((r: any) => r.execution_phase);
      } catch {
        wbsPhases = [];
      }
    }

    let contractorNames: string[] = [];
    try {
      const vendors = await prisma.masterVendor.findMany({
        where: { tenantId: ACTIVE_TENANT_ID, status: "ACTIVE" },
        select: { companyName: true },
        orderBy: { companyName: "asc" },
      });
      contractorNames = vendors.map((v) => v.companyName);
    } catch {
      contractorNames = [];
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { wbsPhases, contractorNames },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { wbsPhases: [], contractorNames: [] },
      error: null,
      meta: null,
    });
  }
}

