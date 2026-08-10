import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

async function ensureSeedUserAccounts() {
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

  try {
    await prisma.$executeRaw`
      DELETE FROM user_accounts a
      USING user_accounts b
      WHERE a.created_at > b.created_at
        AND LOWER(a.corporate_email) = LOWER(b.corporate_email)
    `;
  } catch {
  }

  try {
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts (LOWER(corporate_email))
    `;
  } catch {
  }

  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM user_accounts WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid LIMIT 1
  `;

  if (existing.length === 0) {
    const tenantId = ACTIVE_TENANT_ID;
    const today = new Date().toISOString().split("T")[0];

    const seedAccounts = [
      {
        fullName: "Aman Bele",
        corporateEmail: "aman.bele@avenuebuilders.in",
        assignedRole: "Governance Director",
        department: "Executive Administration",
      },
      {
        fullName: "Rahul Sharma",
        corporateEmail: "sales.executive@avenuebuilders.in",
        assignedRole: "Sales Specialist",
        department: "CRM & Sales",
      },
      {
        fullName: "Priya Kulkarni",
        corporateEmail: "finance.lead@avenuebuilders.in",
        assignedRole: "Finance Lead",
        department: "Finance & Accounting",
      },
      {
        fullName: "Vikram Patil",
        corporateEmail: "site.engineer@avenuebuilders.in",
        assignedRole: "Site Engineer",
        department: "Site Operations",
      },
      {
        fullName: "Neha Deshmukh",
        corporateEmail: "hr.lead@avenuebuilders.in",
        assignedRole: "HR Lead",
        department: "Workforce Ops",
      },
      {
        fullName: "Suresh Mehta",
        corporateEmail: "legal.lead@avenuebuilders.in",
        assignedRole: "Legal Lead",
        department: "Compliance & Land",
      },
    ];

    for (const u of seedAccounts) {
      try {
        await prisma.$executeRaw`
          INSERT INTO user_accounts (
            tenant_id, full_name, corporate_email, assigned_role, department, account_status, last_active_date
          ) VALUES (
            ${tenantId}::uuid, ${u.fullName}, ${u.corporateEmail}, ${u.assignedRole}, ${u.department}, 'ACTIVE', ${today}
          )
          ON CONFLICT DO NOTHING
        `;
      } catch {
      }
    }
  }
}

export async function GET() {
  try {
    await ensureSeedUserAccounts();
    const tenantId = ACTIVE_TENANT_ID;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM user_accounts WHERE tenant_id = ${tenantId}::uuid ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      fullName: r.full_name || "",
      corporateEmail: r.corporate_email || "",
      assignedRole: r.assigned_role || "",
      department: r.department || "",
      accountStatus: r.account_status || "ACTIVE",
      lastActiveDate: r.last_active_date || new Date().toISOString().split("T")[0],
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
    await ensureSeedUserAccounts();
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

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO user_accounts (
        tenant_id, full_name, corporate_email, assigned_role,
        department, account_status, last_active_date
      ) VALUES (
        ${tenantId}::uuid, ${fullName}, ${corporateEmail}, ${assignedRole},
        ${department || "Operations"}, 'ACTIVE', ${new Date().toISOString().split("T")[0]}
      )
      ON CONFLICT DO NOTHING
      RETURNING *
    `;

    let created = inserted && inserted.length > 0 ? inserted[0] : null;

    if (!created) {
      const fetched = await prisma.$queryRaw<any[]>`
        SELECT * FROM user_accounts WHERE LOWER(corporate_email) = LOWER(${corporateEmail}) LIMIT 1
      `;
      created = fetched[0];
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        fullName: created.full_name,
        corporateEmail: created.corporate_email,
        assignedRole: created.assigned_role,
        department: created.department,
        accountStatus: created.account_status || "ACTIVE",
        lastActiveDate: created.last_active_date,
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
