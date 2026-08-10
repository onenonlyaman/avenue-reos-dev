import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

async function ensureSeedUsers() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS system_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL DEFAULT 'pbkdf2_sha256$default_hash',
      department VARCHAR(100) NOT NULL,
      designation VARCHAR(100) NOT NULL,
      site_location VARCHAR(255) NOT NULL DEFAULT 'Nashik Corporate Office',
      mfa_enabled BOOLEAN NOT NULL DEFAULT true,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      role VARCHAR(100) NOT NULL DEFAULT 'Site Engineer',
      last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM system_users WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid LIMIT 1
  `;

  if (existing.length === 0) {
    const tenantId = ACTIVE_TENANT_ID;

    const seedAccounts = [
      {
        fullName: "Aman Bele",
        email: "aman.bele@avenuebuilders.in",
        department: "Executive Administration",
        designation: "Chief Platform Architect",
        role: "Governance Director",
        siteLocation: "Nashik Corporate HQ",
      },
      {
        fullName: "Rahul Sharma",
        email: "sales.executive@avenuebuilders.in",
        department: "CRM & Sales",
        designation: "Senior Sales Executive",
        role: "Sales Specialist",
        siteLocation: "Nashik Sales Gallery",
      },
      {
        fullName: "Priya Kulkarni",
        email: "finance.lead@avenuebuilders.in",
        department: "Finance & Accounting",
        designation: "VP Financial Operations",
        role: "Finance Lead",
        siteLocation: "Nashik Corporate HQ",
      },
      {
        fullName: "Vikram Patil",
        email: "site.engineer@avenuebuilders.in",
        department: "Site Operations",
        designation: "Chief Site Engineer",
        role: "Site Engineer",
        siteLocation: "Gangapur Road Site",
      },
      {
        fullName: "Neha Deshmukh",
        email: "hr.lead@avenuebuilders.in",
        department: "Workforce Ops",
        designation: "Head of Human Resources",
        role: "HR Lead",
        siteLocation: "Nashik Corporate HQ",
      },
      {
        fullName: "Suresh Mehta",
        email: "legal.lead@avenuebuilders.in",
        department: "Compliance & Land",
        designation: "Senior Legal Counsel",
        role: "Legal Lead",
        siteLocation: "Nashik Corporate HQ",
      },
    ];

    for (const u of seedAccounts) {
      await prisma.$executeRaw`
        INSERT INTO system_users (
          tenant_id, full_name, email, department, designation, site_location, role, status
        ) VALUES (
          ${tenantId}::uuid, ${u.fullName}, ${u.email}, ${u.department}, ${u.designation}, ${u.siteLocation}, ${u.role}, 'ACTIVE'
        )
        ON CONFLICT (email) DO NOTHING
      `;
    }
  }
}

export async function GET() {
  try {
    await ensureSeedUsers();

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM system_users WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((u: any) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      department: u.department,
      designation: u.designation,
      siteLocation: u.site_location,
      mfaEnabled: Boolean(u.mfa_enabled),
      status: u.status,
      role: u.role,
      lastActive: u.last_active ? new Date(u.last_active).toISOString() : new Date().toISOString(),
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
        message: err instanceof Error ? err.message : "User directory could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSeedUsers();
    const body = await request.json();
    const { fullName, email, department, designation, role, siteLocation } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!fullName || !email) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Full name and email are required" },
        meta: null,
      });
    }

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO system_users (
        tenant_id, full_name, email, department, designation, site_location, role, status
      ) VALUES (
        ${tenantId}::uuid, ${fullName}, ${email}, ${department || "Engineering"},
        ${designation || "Project Manager"}, ${siteLocation || "Nashik Corporate Office"},
        ${role || "Site Engineer"}, 'ACTIVE'
      )
      ON CONFLICT (email) DO UPDATE SET
        full_name = ${fullName},
        department = ${department || "Engineering"},
        designation = ${designation || "Project Manager"},
        role = ${role || "Site Engineer"}
      RETURNING *
    `;

    const user = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        department: user.department,
        designation: user.designation,
        siteLocation: user.site_location,
        mfaEnabled: Boolean(user.mfa_enabled),
        status: user.status,
        role: user.role,
        lastActive: user.last_active ? new Date(user.last_active).toISOString() : new Date().toISOString(),
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
        code: "USER_INVITE_ERROR",
        message: err instanceof Error ? err.message : "New user could not be completed",
      },
      meta: null,
    });
  }
}
