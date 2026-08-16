import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;

    await runtimeDdl("table:hr_employees", () => prisma.$executeRaw`
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
        corporate_email VARCHAR(255) NOT NULL DEFAULT '',
        contact_number VARCHAR(50) NOT NULL DEFAULT '',
        basic_salary NUMERIC(15,2) NOT NULL DEFAULT 45000,
        allowances NUMERIC(15,2) NOT NULL DEFAULT 15000,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await runtimeDdl("alter:hr_employees_salaries", () => prisma.$executeRaw`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE hr_employees ADD COLUMN basic_salary NUMERIC(15,2) NOT NULL DEFAULT 45000;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE hr_employees ADD COLUMN allowances NUMERIC(15,2) NOT NULL DEFAULT 15000;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
      END $$;
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM hr_employees 
      WHERE tenant_id = ${tenantId}::uuid 
      ORDER BY created_at DESC
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
      corporateEmail: r.corporate_email || "",
      contactNumber: r.contact_number || "",
      basicSalary: Number(r.basic_salary || 0),
      allowances: Number(r.allowances || 0),
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
        message: safeErrorMessage(err, "Workforce directory could not be loaded"),
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
      fullName,
      designation,
      department,
      siteLocation,
      workforceType,
      corporateEmail,
      contactNumber,
      basicSalary,
      allowances,
      joiningDate,
    } = body;

    if (!fullName || !designation || !department) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Full name, designation, and department are required." },
        meta: null,
      }, { status: 400 });
    }

    await runtimeDdl("table:hr_employees", () => prisma.$executeRaw`
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
        corporate_email VARCHAR(255) NOT NULL DEFAULT '',
        contact_number VARCHAR(50) NOT NULL DEFAULT '',
        basic_salary NUMERIC(15,2) NOT NULL DEFAULT 45000,
        allowances NUMERIC(15,2) NOT NULL DEFAULT 15000,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const finalJoiningDate = joiningDate || new Date().toISOString().split("T")[0];
    const finalBasic = Number(basicSalary) > 0 ? Number(basicSalary) : 45000;
    const finalAllowances = Number(allowances) >= 0 ? Number(allowances) : 15000;

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO hr_employees (
        tenant_id, full_name, designation, department, site_location,
        workforce_type, status, joining_date, corporate_email, contact_number,
        basic_salary, allowances
      ) VALUES (
        ${tenantId}::uuid, ${fullName}, ${designation}, ${department}, ${siteLocation || "Nashik Corporate Headquarters"},
        ${workforceType || "Permanent"}, 'ACTIVE', ${finalJoiningDate}, ${corporateEmail || ""}, ${contactNumber || ""},
        ${finalBasic}, ${finalAllowances}
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
        basicSalary: Number(created.basic_salary),
        allowances: Number(created.allowances),
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
        code: "EMPLOYEE_CREATE_ERROR",
        message: safeErrorMessage(err, "Employee record could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}
