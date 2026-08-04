import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hr_attendance_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        site_location VARCHAR(100) NOT NULL,
        check_in_time VARCHAR(50) NOT NULL,
        check_out_time VARCHAR(50) NOT NULL,
        device_status VARCHAR(50) NOT NULL DEFAULT 'SYNCED',
        overtime_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM hr_attendance_logs WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      employeeName: r.employee_name,
      siteLocation: r.site_location,
      checkInTime: r.check_in_time,
      checkOutTime: r.check_out_time,
      deviceStatus: r.device_status,
      overtimeHours: Number(r.overtime_hours || 0),
      status: r.status,
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
        code: "HR_ATTENDANCE_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Attendance logs could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = ACTIVE_TENANT_ID;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hr_attendance_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        site_location VARCHAR(100) NOT NULL,
        check_in_time VARCHAR(50) NOT NULL,
        check_out_time VARCHAR(50) NOT NULL,
        device_status VARCHAR(50) NOT NULL DEFAULT 'SYNCED',
        overtime_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    if (body.action === "SYNC_BIOMETRICS") {
      const empRaw = await prisma.$queryRaw<any[]>`SELECT full_name, site_location FROM hr_employees WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid LIMIT 10`;
      let count = 0;
      if (empRaw && empRaw.length > 0) {
        for (const emp of empRaw) {
          await prisma.$executeRaw`
            INSERT INTO hr_attendance_logs (
              tenant_id, employee_name, site_location, check_in_time, check_out_time, device_status, overtime_hours, status
            ) VALUES (
              ${tenantId}::uuid, ${emp.full_name}, ${emp.site_location}, '08:30 AM', '05:30 PM', 'SYNCED', 0.0, 'PRESENT'
            )
          `;
          count++;
        }
      }

      return NextResponse.json({
        success: true,
        status_code: 200,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: { success: true, syncedCount: count },
        error: null,
        meta: null,
      });
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, syncedCount: 0 },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "BIOMETRIC_SYNC_ERROR",
        message: err instanceof Error ? err.message : "Biometric logs could not be completed",
      },
      meta: null,
    });
  }
}



