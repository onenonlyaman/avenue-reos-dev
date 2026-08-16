import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

const isUuid = (val: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where: any = { tenantId };
    if (projectId && projectId !== "All" && projectId !== "All Nashik Developments") {
      if (isUuid(projectId)) {
        where.projectId = projectId;
      } else {
        where.project = { projectName: { contains: projectId, mode: "insensitive" } };
      }
    }

    const sites = await prisma.constructionSite.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
            projectCode: true,
            location: true,
          },
        },
        siteEngineer: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = sites.map((s) => ({
      id: s.id,
      projectId: s.projectId,
      projectName: s.project?.projectName || "Unknown Development",
      projectCode: s.project?.projectCode || "",
      siteCode: s.siteCode,
      siteName: s.siteName,
      gpsCoordinates: s.gpsCoordinates,
      status: s.status,
      siteEngineerId: s.siteEngineerId,
      siteEngineerName: s.siteEngineer?.fullName || "Unassigned",
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
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
        code: "SITES_FETCH_ERROR",
        message: safeErrorMessage(err, "Construction sites could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;
    const body = await request.json();

    const {
      projectId,
      siteCode,
      siteName,
      gpsCoordinates,
      siteEngineerId,
      status = "ACTIVE",
    } = body;

    if (!siteName || typeof siteName !== "string" || !siteName.trim()) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Site name is required." },
        meta: null,
      }, { status: 400 });
    }

    // Resolve project
    let resolvedProjectId = projectId;
    if (!resolvedProjectId || !isUuid(resolvedProjectId)) {
      let project = null;
      if (resolvedProjectId && typeof resolvedProjectId === "string") {
        project = await prisma.masterProject.findFirst({
          where: { tenantId, projectName: { contains: resolvedProjectId.trim(), mode: "insensitive" } },
        });
      }
      if (!project) {
        project = await prisma.masterProject.findFirst({
          where: { tenantId },
          orderBy: { createdAt: "asc" },
        });
      }
      if (!project) {
        // Create standard project
        project = await prisma.masterProject.create({
          data: {
            tenantId,
            projectCode: `PRJ-${Date.now().toString(36).toUpperCase()}`,
            projectName: `${siteName.trim()} Master Phase`,
            location: "Nashik Region",
            totalAreaSqft: 250000.0,
            totalBudget: 150000000.0,
            status: "IN_PROGRESS",
            startDate: new Date(),
            expectedCompletionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
      }
      resolvedProjectId = project.id;
    }

    // Resolve Site Engineer
    let resolvedEngineerId = siteEngineerId;
    if (!resolvedEngineerId || !isUuid(resolvedEngineerId)) {
      let emp = null;
      if (resolvedEngineerId && typeof resolvedEngineerId === "string") {
        emp = await prisma.masterEmployee.findFirst({
          where: { tenantId, fullName: { contains: resolvedEngineerId.trim(), mode: "insensitive" } },
        });
      }
      if (!emp) {
        emp = await prisma.masterEmployee.findFirst({
          where: { tenantId, status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
        });
      }
      if (!emp) {
        emp = await prisma.masterEmployee.create({
          data: {
            tenantId,
            employeeCode: `EMP-${Date.now().toString(36).toUpperCase()}`,
            fullName: "Lead Project Engineer",
            email: `engineer-${Date.now().toString(36)}@avenue.internal`,
            phone: "+91 98220 12345",
            department: "Civil Engineering & Execution",
            role: "Site Incharge",
            designation: "Chief Resident Engineer",
            status: "ACTIVE",
            joiningDate: new Date(),
          },
        });
      }
      resolvedEngineerId = emp.id;
    }

    const generatedCode = siteCode && typeof siteCode === "string" && siteCode.trim()
      ? siteCode.trim().toUpperCase()
      : `SITE-${Date.now().toString(36).toUpperCase()}`;

    const validStatus = ["PREPARATION", "ACTIVE", "COMPLETED", "HALTED"].includes(status)
      ? status
      : "ACTIVE";

    const createdSite = await prisma.constructionSite.create({
      data: {
        tenantId,
        projectId: resolvedProjectId,
        siteCode: generatedCode,
        siteName: siteName.trim(),
        gpsCoordinates: gpsCoordinates || "19.9975° N, 73.7898° E (Nashik)",
        status: validStatus,
        siteEngineerId: resolvedEngineerId,
      },
      include: {
        project: { select: { projectName: true, projectCode: true } },
        siteEngineer: { select: { fullName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: createdSite.id,
        projectId: createdSite.projectId,
        projectName: createdSite.project?.projectName,
        siteCode: createdSite.siteCode,
        siteName: createdSite.siteName,
        gpsCoordinates: createdSite.gpsCoordinates,
        status: createdSite.status,
        siteEngineerId: createdSite.siteEngineerId,
        siteEngineerName: createdSite.siteEngineer?.fullName,
        createdAt: createdSite.createdAt.toISOString(),
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
        code: "SITE_CREATE_ERROR",
        message: safeErrorMessage(err, "Construction site could not be created"),
      },
      meta: null,
    }, { status: 500 });
  }
}
