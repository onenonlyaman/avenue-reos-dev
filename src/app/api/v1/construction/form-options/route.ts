import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess } from "@/lib/apiAccess";

const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const tenantId = auth.user.tenantId;

    const wbsWhere: any = { tenantId };
    if (projectId && projectId !== "All" && projectId !== "All Nashik Developments") {
      if (isUuid(projectId)) {
        wbsWhere.projectId = projectId;
      } else {
        wbsWhere.project = { projectName: { contains: projectId, mode: "insensitive" } };
      }
    }

    const milestones = await prisma.constructionWbsMilestone.findMany({
      where: wbsWhere,
      select: { executionPhase: true },
      distinct: ["executionPhase"],
      orderBy: { executionPhase: "asc" },
    });
    const wbsPhases = milestones.map((m) => m.executionPhase).filter(Boolean);

    const vendors = await prisma.masterVendor.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { companyName: true },
      orderBy: { companyName: "asc" },
    });
    const contractorNames = vendors.map((v) => v.companyName).filter(Boolean);

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


