import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const model = (prisma as any).userAccount;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS user_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            corporate_email VARCHAR(255) NOT NULL,
            assigned_role VARCHAR(100) NOT NULL,
            department VARCHAR(100) NOT NULL,
            account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
            last_active_date VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM user_accounts WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      fullName: r.fullName || r.full_name || "",
      corporateEmail: r.corporateEmail || r.corporate_email || "",
      assignedRole: r.assignedRole || r.assigned_role || "",
      department: r.department || "",
      accountStatus: r.accountStatus || r.account_status || "ACTIVE",
      lastActiveDate: r.lastActiveDate || r.last_active_date || new Date().toISOString().split("T")[0],
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
        code: "USERS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "User accounts could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, corporateEmail, assignedRole, department } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!fullName || !corporateEmail || !assignedRole) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Full name, corporate email, and role are required." },
        meta: null,
      });
    }

    const model = (prisma as any).userAccount;
    let created: any = null;

    if (model?.create) {
      created = await model.create({
        data: {
          tenantId,
          fullName,
          corporateEmail,
          assignedRole,
          department: department || "Operations",
          accountStatus: "ACTIVE",
          lastActiveDate: new Date().toISOString().split("T")[0],
        },
      });
    } else {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS user_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            corporate_email VARCHAR(255) NOT NULL,
            assigned_role VARCHAR(100) NOT NULL,
            department VARCHAR(100) NOT NULL,
            account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
            last_active_date VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        const inserted = await prisma.$queryRaw<any[]>`
          INSERT INTO user_accounts (
            tenant_id, full_name, corporate_email, assigned_role,
            department, account_status, last_active_date
          ) VALUES (
            ${tenantId}::uuid, ${fullName}, ${corporateEmail}, ${assignedRole},
            ${department || "Operations"}, 'ACTIVE', ${new Date().toISOString().split("T")[0]}
          )
          RETURNING *
        `;
        created = inserted[0];
      } catch (err: unknown) {
        throw new Error(err instanceof Error ? err.message : "User account could not be saved");
      }
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        fullName: created.fullName || created.full_name,
        corporateEmail: created.corporateEmail || created.corporate_email,
        assignedRole: created.assignedRole || created.assigned_role,
        department: created.department,
        accountStatus: created.accountStatus || created.account_status || "ACTIVE",
        lastActiveDate: created.lastActiveDate || created.last_active_date,
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
        code: "USER_PROVISION_ERROR",
        message: err instanceof Error ? err.message : "User account could not be saved",
      },
      meta: null,
    });
  }
}



