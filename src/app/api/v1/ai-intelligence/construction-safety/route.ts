import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
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
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM ai_construction_safety WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
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
        message: err instanceof Error ? err.message : "Construction safety insights could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}



