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
    const tenantId = auth.user.tenantId;

    const where: any = { tenantId };

    if (projectId && projectId !== "All" && projectId !== "All Nashik Developments") {
      if (isUuid(projectId)) {
        where.site = { projectId };
      } else {
        where.site = { project: { projectName: { contains: projectId, mode: "insensitive" } } };
      }
    }

    const ncrReports = await prisma.qualityNcrReport.findMany({
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
        inspector: {
          select: {
            id: true,
            fullName: true,
          },
        },
        contractor: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = ncrReports.map((n) => ({
      id: n.id,
      inspectionDate: n.createdAt ? new Date(n.createdAt).toISOString().split("T")[0] : "",
      siteLocation: n.site?.siteName || n.site?.project?.projectName || "Construction Site",
      category: n.defectSeverity === "CRITICAL" ? "Safety & Structural Risk Audit" : "Site Quality Inspection",
      inspectingEngineer: n.inspector?.fullName || "Site Inspector",
      contractorName: n.contractor?.companyName || "",
      defectSeverity: n.defectSeverity,
      status: n.status === "CLOSED" || n.status === "RESOLVED" ? "PASSED" : n.status === "OPEN" ? "VIOLATION_FLAGGED" : "RESOLVED",
      remarks: n.description || "",
      correctiveAction: n.correctiveAction || "",
      projectName: n.site?.project?.projectName || "",
      projectId: n.site?.projectId || "",
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
        code: "INSPECTIONS_FETCH_ERROR",
        message: safeErrorMessage(err, "Quality and safety inspections could not be loaded"),
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
    const { projectId, siteId, ncrNumber, defectSeverity, description, correctiveAction, inspectorName, contractorName } = body;
    const tenantId = auth.user.tenantId;

    if (!defectSeverity || typeof defectSeverity !== "string" || !["MINOR", "MAJOR", "CRITICAL"].includes(defectSeverity.toUpperCase())) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INVALID_SEVERITY",
          message: "Defect severity must be MINOR, MAJOR, or CRITICAL",
        },
        meta: null,
      }, { status: 400 });
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "MISSING_DESCRIPTION",
          message: "Observation and defect description are required",
        },
        meta: null,
      }, { status: 400 });
    }

    // Resolve site
    let site = null;
    if (siteId && isUuid(siteId)) {
      site = await prisma.constructionSite.findFirst({ where: { id: siteId, tenantId } });
    } else if (projectId) {
      if (isUuid(projectId)) {
        site = await prisma.constructionSite.findFirst({ where: { projectId, tenantId } });
      } else {
        const proj = await prisma.masterProject.findFirst({
          where: { tenantId, projectName: { equals: projectId.trim(), mode: "insensitive" } },
        });
        if (proj) {
          site = await prisma.constructionSite.findFirst({ where: { projectId: proj.id, tenantId } });
        }
      }
    }

    if (!site) {
      site = await prisma.constructionSite.findFirst({
        where: { tenantId },
      });
    }

    if (!site) {
      // Find active project to attach site
      const project = await prisma.masterProject.findFirst({ where: { tenantId } });
      const emp = await prisma.masterEmployee.findFirst({ where: { tenantId, status: "ACTIVE" } });

      if (!project || !emp) {
        return NextResponse.json({
          success: false,
          status_code: 422,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: {
            code: "NO_SITE_ON_RECORD",
            message: "A project and site engineer must be registered before logging quality inspections",
          },
          meta: null,
        }, { status: 422 });
      }

      site = await prisma.constructionSite.create({
        data: {
          tenantId,
          projectId: project.id,
          siteCode: `SITE-${project.projectCode || Date.now().toString().slice(-4)}`,
          siteName: `${project.projectName} Site`,
          gpsCoordinates: project.location || "Nashik Site",
          status: "ACTIVE",
          siteEngineerId: emp.id,
        },
      });
    }

    // Resolve inspector
    let inspector = null;
    if (inspectorName && typeof inspectorName === "string" && inspectorName.trim()) {
      inspector = await prisma.masterEmployee.findFirst({
        where: { tenantId, fullName: { contains: inspectorName.trim(), mode: "insensitive" }, status: "ACTIVE" },
      });
    }

    if (!inspector) {
      inspector = await prisma.masterEmployee.findFirst({
        where: { tenantId, status: "ACTIVE" },
      });
    }

    if (!inspector) {
      return NextResponse.json({
        success: false,
        status_code: 422,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "NO_INSPECTOR_ON_RECORD",
          message: "An active inspecting engineer must exist in the workforce directory",
        },
        meta: null,
      }, { status: 422 });
    }

    // Resolve contractor if provided
    let contractor = null;
    if (contractorName && typeof contractorName === "string" && contractorName.trim()) {
      contractor = await prisma.masterVendor.findFirst({
        where: { tenantId, companyName: { contains: contractorName.trim(), mode: "insensitive" } },
      });
    }

    const reference = (ncrNumber && typeof ncrNumber === "string" ? ncrNumber.trim() : "") || `NCR-${Date.now().toString().slice(-6)}`;

    const createdNcr = await prisma.qualityNcrReport.create({
      data: {
        tenantId,
        ncrNumber: reference,
        siteId: site.id,
        inspectorId: inspector.id,
        contractorId: contractor ? contractor.id : null,
        defectSeverity: defectSeverity.toUpperCase(),
        status: "OPEN",
        description: description.trim(),
        correctiveAction: correctiveAction && typeof correctiveAction === "string" ? correctiveAction.trim() : null,
      },
      include: {
        site: {
          include: {
            project: true,
          },
        },
        inspector: true,
        contractor: true,
      },
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: createdNcr.id,
        inspectionDate: createdNcr.createdAt.toISOString().split("T")[0],
        siteLocation: createdNcr.site.siteName,
        category: createdNcr.defectSeverity === "CRITICAL" ? "Safety & Structural Risk Audit" : "Site Quality Inspection",
        inspectingEngineer: createdNcr.inspector.fullName,
        contractorName: createdNcr.contractor?.companyName || "",
        defectSeverity: createdNcr.defectSeverity,
        status: "VIOLATION_FLAGGED",
        remarks: createdNcr.description,
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
        code: "INSPECTION_CREATE_ERROR",
        message: safeErrorMessage(err, "Inspection record could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}


