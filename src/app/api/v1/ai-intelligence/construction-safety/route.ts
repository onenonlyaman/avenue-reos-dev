import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:ai_construction_safety", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ai_construction_safety (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        camera_location VARCHAR(255) NOT NULL,
        incident_type VARCHAR(100) NOT NULL,
        risk_severity VARCHAR(50) NOT NULL DEFAULT 'MODERATE',
        labor_count INT NOT NULL DEFAULT 0,
        projected_schedule_delay_days INT NOT NULL DEFAULT 0,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM ai_construction_safety
      WHERE tenant_id = ${auth.user.tenantId}::uuid
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      cameraLocation: r.camera_location,
      incidentType: r.incident_type,
      riskSeverity: r.risk_severity,
      laborCount: Number(r.labor_count || 0),
      projectedScheduleDelayDays: Number(r.projected_schedule_delay_days || 0),
      timestamp: r.timestamp,
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
        code: "CONSTRUCTION_SAFETY_FETCH_ERROR",
        message: safeErrorMessage(err, "Construction safety insights could not be loaded"),
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
      cameraLocation,
      incidentType,
      riskSeverity = "MODERATE",
      laborCount = 0,
      projectedScheduleDelayDays = 0,
    } = body;

    if (!cameraLocation || !incidentType) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Camera location and incident type are required." },
        meta: null,
      }, { status: 400 });
    }

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO ai_construction_safety (
        tenant_id, camera_location, incident_type, risk_severity, labor_count, projected_schedule_delay_days
      ) VALUES (
        ${tenantId}::uuid,
        ${cameraLocation.trim()},
        ${incidentType.trim()},
        ${riskSeverity.trim().toUpperCase()},
        ${Number(laborCount) || 0},
        ${Number(projectedScheduleDelayDays) || 0}
      )
      RETURNING *
    `;

    const r = inserted[0];
    const mapped = {
      id: r.id,
      cameraLocation: r.camera_location,
      incidentType: r.incident_type,
      riskSeverity: r.risk_severity,
      laborCount: Number(r.labor_count || 0),
      projectedScheduleDelayDays: Number(r.projected_schedule_delay_days || 0),
      timestamp: r.timestamp,
    };

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
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
        code: "CONSTRUCTION_SAFETY_CREATE_ERROR",
        message: safeErrorMessage(err, "Construction safety observation could not be recorded"),
      },
      meta: null,
    }, { status: 500 });
  }
}
