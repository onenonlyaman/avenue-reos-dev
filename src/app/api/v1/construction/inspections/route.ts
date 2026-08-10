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

    const ncrModel = (prisma as any).qualityNcrReport;
    let ncrReports: any[] = [];

    if (ncrModel?.findMany) {
      const where: any = {};
      if (projectId && projectId !== "All" && projectId !== "All Nashik Developments") {
        if (isUuid(projectId)) {
          where.OR = [
            { site: { projectId } },
            { site: { project: { projectName: { contains: projectId, mode: "insensitive" } } } },
          ];
        } else {
          where.site = { project: { projectName: { contains: projectId, mode: "insensitive" } } };
        }
      }
      ncrReports = await ncrModel.findMany({
        where,
        include: {
          site: { include: { project: true } },
          inspector: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT q.*, s.site_name, p.project_name, e.full_name as inspector_name
          FROM quality_ncr_reports q
          LEFT JOIN construction_sites s ON q.site_id = s.id
          LEFT JOIN master_project p ON s.project_id = p.id
          LEFT JOIN master_employee e ON q.inspector_id = e.id
          WHERE q.tenant_id = ${ACTIVE_TENANT_ID}::uuid
        `;
        ncrReports = raw.map((r: any) => ({
          id: r.id,
          createdAt: r.created_at,
          defectSeverity: r.defect_severity,
          status: r.status,
          description: r.description,
          site: { siteName: r.site_name, project: { projectName: r.project_name } },
          inspector: { fullName: r.inspector_name },
        }));
      } catch {
        ncrReports = [];
      }
    }

    const mapped = (ncrReports || []).map((n: any) => ({
      id: n.id,
      inspectionDate: n.createdAt ? new Date(n.createdAt).toISOString().split("T")[0] : "",
      siteLocation: n.site?.siteName || n.site?.project?.projectName || "",
      category: n.defectSeverity === "CRITICAL" ? "Safety & Structural Risk Audit" : "Site Quality Inspection",
      inspectingEngineer: n.inspector?.fullName || "",
      status: n.status === "CLOSED" || n.status === "RESOLVED" ? "PASSED" : n.status === "OPEN" ? "VIOLATION_FLAGGED" : "RESOLVED",
      remarks: n.description || "",
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
    const { ncrNumber, defectSeverity, description, correctiveAction, inspectorName, contractorName } = body;

    if (!defectSeverity || !description) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_INSPECTION_RECORD",
          message: "Defect severity and observation details are required",
        },
        meta: null,
      }, { status: 400 });
    }

    const site = await prisma.$queryRaw<any[]>`
      SELECT id FROM construction_sites WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid LIMIT 1
    `;

    if (!site || site.length === 0) {
      return NextResponse.json({
        success: false,
        status_code: 422,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "NO_SITE_ON_RECORD",
          message: "Register a construction site before logging inspections",
        },
        meta: null,
      }, { status: 422 });
    }

    const inspector = inspectorName
      ? await prisma.masterEmployee.findFirst({
          where: { tenantId: ACTIVE_TENANT_ID, fullName: { contains: inspectorName, mode: "insensitive" }, status: "ACTIVE" },
        })
      : await prisma.masterEmployee.findFirst({ where: { tenantId: ACTIVE_TENANT_ID, status: "ACTIVE" } });

    if (!inspector) {
      return NextResponse.json({
        success: false,
        status_code: 422,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "NO_INSPECTOR_ON_RECORD",
          message: "Register an inspecting engineer in the workforce directory first",
        },
        meta: null,
      }, { status: 422 });
    }

    const contractor = contractorName
      ? await prisma.masterVendor.findFirst({
          where: { tenantId: ACTIVE_TENANT_ID, companyName: { contains: contractorName, mode: "insensitive" } },
        })
      : null;

    const reference = ncrNumber || `NCR-${Date.now().toString().slice(-6)}`;

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO quality_ncr_reports (
        id, tenant_id, ncr_number, site_id, inspector_id, contractor_id,
        defect_severity, status, description, corrective_action
      ) VALUES (
        gen_random_uuid(), ${ACTIVE_TENANT_ID}::uuid, ${reference}, ${site[0].id}::uuid, ${inspector.id}::uuid,
        ${contractor ? contractor.id : null}::uuid,
        ${defectSeverity}, 'OPEN', ${description}, ${correctiveAction || null}
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
        ncrNumber: created.ncr_number,
        defectSeverity: created.defect_severity,
        status: created.status,
        description: created.description,
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

