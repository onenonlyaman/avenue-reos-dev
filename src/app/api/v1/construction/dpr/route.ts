import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

const isUuid = (val: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const date = searchParams.get("date");
    const tenantId = auth.user.tenantId;

    const where: any = { tenantId };

    if (projectId && projectId !== "All" && projectId !== "All Nashik Developments") {
      if (isUuid(projectId)) {
        where.site = { projectId };
      } else {
        where.site = { project: { projectName: { contains: projectId, mode: "insensitive" } } };
      }
    }

    if (date) {
      where.reportDate = new Date(date);
    }

    const dprs = await prisma.dailyProgressReport.findMany({
      where,
      include: {
        site: {
          include: {
            project: {
              select: {
                id: true,
                projectName: true,
              },
            },
          },
        },
        submittedByEmployee: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { reportDate: "desc" },
    });

    const mapped = dprs.map((d) => {
      const details = (d.workDetailsJson as Record<string, any>) || {};
      const skilled = Number(details.skilledLaborCount || 0);
      const unskilled = Number(details.unskilledLaborCount || 0);

      return {
        id: d.id,
        reportDate: d.reportDate ? new Date(d.reportDate).toISOString().split("T")[0] : "",
        supervisingEngineer: details.supervisingEngineer || d.submittedByEmployee?.fullName || "",
        skilledLaborCount: skilled,
        unskilledLaborCount: unskilled,
        totalLaborCount: d.laborCount || skilled + unskilled,
        equipmentHours: Number(details.equipmentHours || 0),
        cementBags: Number(details.cementBags || 0),
        steelMt: Number(details.steelMt || 0),
        concreteM3: Number(details.concreteM3 || 0),
        workDetails: details.workDetails || "",
        physicalProgressPct: Number(d.progressPercentage || 0),
        projectName: d.site?.project?.projectName || "",
        projectId: d.site?.projectId || "",
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
        code: "DPR_FETCH_ERROR",
        message: safeErrorMessage(err, "Site progress reports could not be loaded"),
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
      reportDate,
      supervisingEngineer,
      skilledLaborCount,
      unskilledLaborCount,
      equipmentHours,
      cementBags,
      steelMt,
      concreteM3,
      workDetails,
      physicalProgressPct,
      siteGpsCoordinates,
    } = body;
    const tenantId = auth.user.tenantId;

    if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_PROJECT", message: "A development project must be selected" },
        meta: null,
      }, { status: 400 });
    }

    // Resolve project in tenant
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
          message: "Selected project development was not found in your organization",
        },
        meta: null,
      }, { status: 404 });
    }

    // Resolve or establish construction site for this project
    let site = await prisma.constructionSite.findFirst({
      where: { tenantId, projectId: project.id },
      include: { siteEngineer: true },
    });

    // Resolve engineer
    let engineer = null;
    if (supervisingEngineer && typeof supervisingEngineer === "string" && supervisingEngineer.trim()) {
      engineer = await prisma.masterEmployee.findFirst({
        where: {
          tenantId,
          fullName: { contains: supervisingEngineer.trim(), mode: "insensitive" },
          status: "ACTIVE",
        },
      });
    }

    if (!engineer) {
      engineer = await prisma.masterEmployee.findFirst({
        where: { tenantId, status: "ACTIVE" },
      });
    }

    if (!engineer) {
      return NextResponse.json({
        success: false,
        status_code: 422,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "NO_ACTIVE_ENGINEER",
          message: "An active engineer must exist in your employee directory before logging DPRs",
        },
        meta: null,
      }, { status: 422 });
    }

    if (!site) {
      site = await prisma.constructionSite.create({
        data: {
          tenantId,
          projectId: project.id,
          siteCode: `SITE-${project.projectCode || Date.now().toString().slice(-4)}`,
          siteName: `${project.projectName} Site Operations`,
          gpsCoordinates: siteGpsCoordinates || project.location || "Nashik Operations",
          status: "ACTIVE",
          siteEngineerId: engineer.id,
        },
        include: { siteEngineer: true },
      });
    }

    const skilled = Math.max(0, parseInt(String(skilledLaborCount || 0), 10));
    const unskilled = Math.max(0, parseInt(String(unskilledLaborCount || 0), 10));
    const totalLabor = skilled + unskilled;
    const progress = Math.max(0, Math.min(100, parseFloat(String(physicalProgressPct || 0))));

    const dprCode = `DPR-${Date.now().toString().slice(-6)}`;
    const detailsJson = {
      supervisingEngineer: supervisingEngineer || engineer.fullName,
      skilledLaborCount: skilled,
      unskilledLaborCount: unskilled,
      equipmentHours: Math.max(0, parseFloat(String(equipmentHours || 0))),
      cementBags: Math.max(0, parseInt(String(cementBags || 0), 10)),
      steelMt: Math.max(0, parseFloat(String(steelMt || 0))),
      concreteM3: Math.max(0, parseFloat(String(concreteM3 || 0))),
      workDetails: (workDetails && typeof workDetails === "string" ? workDetails.trim() : "") || "Routine construction progress logged.",
    };

    const createdDpr = await prisma.dailyProgressReport.create({
      data: {
        tenantId,
        dpr_code: dprCode,
        siteId: site.id,
        reportDate: reportDate ? new Date(reportDate) : new Date(),
        submittedBy: engineer.id,
        laborCount: totalLabor,
        weatherCondition: "Clear Sky",
        progressPercentage: progress,
        status: "APPROVED",
        workDetailsJson: detailsJson,
      },
      include: {
        site: {
          include: {
            project: {
              select: {
                id: true,
                projectName: true,
              },
            },
          },
        },
        submittedByEmployee: {
          select: {
            id: true,
            fullName: true,
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
        id: createdDpr.id,
        reportDate: createdDpr.reportDate ? new Date(createdDpr.reportDate).toISOString().split("T")[0] : "",
        supervisingEngineer: detailsJson.supervisingEngineer,
        skilledLaborCount: detailsJson.skilledLaborCount,
        unskilledLaborCount: detailsJson.unskilledLaborCount,
        totalLaborCount: totalLabor,
        equipmentHours: detailsJson.equipmentHours,
        cementBags: detailsJson.cementBags,
        steelMt: detailsJson.steelMt,
        concreteM3: detailsJson.concreteM3,
        workDetails: detailsJson.workDetails,
        physicalProgressPct: Number(createdDpr.progressPercentage),
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
        code: "DPR_CREATE_ERROR",
        message: safeErrorMessage(err, "DPR log could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}



