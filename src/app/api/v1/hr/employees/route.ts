import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hr_employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        designation VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        site_location VARCHAR(100) NOT NULL,
        workforce_type VARCHAR(50) NOT NULL DEFAULT 'Permanent',
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        joining_date VARCHAR(50) NOT NULL,
        corporate_email VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM hr_employees WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      fullName: r.full_name,
      designation: r.designation,
      department: r.department,
      siteLocation: r.site_location,
      workforceType: r.workforce_type,
      status: r.status,
      joiningDate: r.joining_date,
      corporateEmail: r.corporate_email,
      contactNumber: r.contact_number,
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
        code: "HR_EMPLOYEES_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Workforce directory could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, designation, department, siteLocation, workforceType, corporateEmail, contactNumber } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!fullName || !designation || !department) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Full name, designation, and department are required." },
        meta: null,
      });
    }

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hr_employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        designation VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        site_location VARCHAR(100) NOT NULL,
        workforce_type VARCHAR(50) NOT NULL DEFAULT 'Permanent',
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        joining_date VARCHAR(50) NOT NULL,
        corporate_email VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO hr_employees (
        tenant_id, full_name, designation, department, site_location,
        workforce_type, status, joining_date, corporate_email, contact_number
      ) VALUES (
        ${tenantId}::uuid, ${fullName}, ${designation}, ${department}, ${siteLocation || "Gangapur Road Site"},
        ${workforceType || "Permanent"}, 'ACTIVE', ${new Date().toISOString().split("T")[0]}, ${corporateEmail || ""}, ${contactNumber || ""}
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
        fullName: created.full_name,
        designation: created.designation,
        department: created.department,
        siteLocation: created.site_location,
        workforceType: created.workforce_type,
        status: created.status,
        joiningDate: created.joining_date,
        corporateEmail: created.corporate_email,
        contactNumber: created.contact_number,
      },
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
        code: "EMPLOYEE_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Employee record could not be saved",
      },
      meta: null,
    });
  }
}


