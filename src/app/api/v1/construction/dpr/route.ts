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

    const dprModel = (prisma as any).dailyProgressReport;
    let dprs: any[] = [];

    if (dprModel?.findMany) {
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
      if (date) {
        where.reportDate = new Date(date);
      }
      dprs = await dprModel.findMany({
        where,
        include: {
          site: { include: { project: true } },
          submittedByEmployee: true,
        },
        orderBy: { reportDate: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT d.*, s.site_name, p.project_name, p.id as project_id, e.full_name as emp_name
          FROM daily_progress_reports d
          LEFT JOIN construction_sites s ON d.site_id = s.id
          LEFT JOIN master_project p ON s.project_id = p.id
          LEFT JOIN master_employee e ON d.submitted_by = e.id
          WHERE d.tenant_id = ${ACTIVE_TENANT_ID}::uuid
        `;
        dprs = raw.map((r: any) => ({
          id: r.id,
          reportDate: r.report_date,
          laborCount: r.labor_count,
          progressPercentage: r.progress_percentage,
          workDetailsJson: r.work_details_json,
          submittedByEmployee: { fullName: r.emp_name },
          site: { project: { projectName: r.project_name }, projectId: r.project_id },
        }));
      } catch {
        dprs = [];
      }
    }

    const mapped = (dprs || []).map((d: any) => {
      const details = d.workDetailsJson || {};
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
    const tenantId = ACTIVE_TENANT_ID;

    let site: any = null;
    try {
      const rawSites = await prisma.$queryRaw<any[]>`
        SELECT s.*, p.project_name FROM construction_sites s
        LEFT JOIN master_project p ON s.project_id = p.id
        WHERE s.tenant_id = ${ACTIVE_TENANT_ID}::uuid
        LIMIT 1
      `;
      if (rawSites.length > 0) {
        const r = rawSites[0];
        site = {
          id: r.id,
          siteEngineerId: r.site_engineer_id,
          projectId: r.project_id,
          project: { projectName: r.project_name },
        };
      }
    } catch {
    }

    if (!site) {
      let targetProject = null;
      if (projectId && projectId !== "All Nashik Developments" && projectId !== "All") {
        if (isUuid(projectId)) {
          targetProject = await prisma.masterProject.findFirst({
            where: { tenantId: ACTIVE_TENANT_ID, OR: [{ id: projectId }, { projectName: { contains: projectId, mode: "insensitive" } }] },
          });
        } else {
          targetProject = await prisma.masterProject.findFirst({
            where: { tenantId: ACTIVE_TENANT_ID, projectName: { contains: projectId, mode: "insensitive" } },
          });
        }
      }

      if (!targetProject) {
        targetProject = await prisma.masterProject.findFirst({ where: { tenantId: ACTIVE_TENANT_ID } });
      }

      if (!targetProject) {
        return NextResponse.json({
          success: false,
          status_code: 422,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: {
            code: "NO_PROJECT_FOUND",
            message: "Register a development project before logging site progress",
          },
          meta: null,
        }, { status: 422 });
      }

      const emp = supervisingEngineer
        ? await prisma.masterEmployee.findFirst({
            where: { tenantId, fullName: { contains: supervisingEngineer, mode: "insensitive" }, status: "ACTIVE" },
          })
        : await prisma.masterEmployee.findFirst({ where: { tenantId, status: "ACTIVE" } });

      if (!emp) {
        return NextResponse.json({
          success: false,
          status_code: 422,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: {
            code: "NO_SITE_ENGINEER_ON_RECORD",
            message: "Register a supervising engineer in the workforce directory before logging site progress",
          },
          meta: null,
        }, { status: 422 });
      }

      const newSiteId = (await prisma.$queryRaw<any[]>`
        INSERT INTO construction_sites (
          id, tenant_id, project_id, site_code, site_name, gps_coordinates, status, site_engineer_id, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${tenantId}::uuid, ${targetProject.id}::uuid, ${`SITE-${Date.now().toString().slice(-4)}`}, ${targetProject.projectName}, ${siteGpsCoordinates || ""}, 'ACTIVE', ${emp.id}::uuid, NOW(), NOW()
        )
        RETURNING id
      `)[0]?.id;

      site = {
        id: newSiteId,
        siteEngineerId: emp.id,
        projectId: targetProject.id,
        project: { projectName: targetProject.projectName },
      };
    }

    const totalLabor = Number(skilledLaborCount || 0) + Number(unskilledLaborCount || 0);
    const dprCode = `DPR-${Date.now().toString().slice(-6)}`;
    const detailsJson = {
      supervisingEngineer,
      skilledLaborCount: Number(skilledLaborCount || 0),
      unskilledLaborCount: Number(unskilledLaborCount || 0),
      equipmentHours: Number(equipmentHours || 0),
      cementBags: Number(cementBags || 0),
      steelMt: Number(steelMt || 0),
      concreteM3: Number(concreteM3 || 0),
      workDetails,
    };

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO daily_progress_reports (
        id, tenant_id, dpr_code, site_id, report_date, submitted_by,
        labor_count, weather_condition, progress_percentage, status, work_details_json,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${tenantId}::uuid, ${dprCode}, ${site.id}::uuid, ${new Date(reportDate || Date.now())}::date, ${site.siteEngineerId}::uuid,
        ${totalLabor}, 'Clear Sky', ${Number(physicalProgressPct || 0)}, 'APPROVED', ${JSON.stringify(detailsJson)}::jsonb,
        NOW(), NOW()
      )
      RETURNING *
    `;
    const createdDpr = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: createdDpr.id,
        reportDate: createdDpr.report_date ? new Date(createdDpr.report_date).toISOString().split("T")[0] : "",
        supervisingEngineer: supervisingEngineer || "",
        skilledLaborCount: Number(skilledLaborCount || 0),
        unskilledLaborCount: Number(unskilledLaborCount || 0),
        totalLaborCount: totalLabor,
        equipmentHours: Number(equipmentHours || 0),
        cementBags: Number(cementBags || 0),
        steelMt: Number(steelMt || 0),
        concreteM3: Number(concreteM3 || 0),
        workDetails: workDetails || "",
        physicalProgressPct: Number(physicalProgressPct || 0),
        projectName: site.project?.projectName || "",
        projectId: site.projectId,
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


