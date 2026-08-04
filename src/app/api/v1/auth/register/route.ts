import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, department, designation } = body;
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

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO system_users (
        tenant_id, full_name, email, department, designation, role, status
      ) VALUES (
        ${tenantId}::uuid, ${fullName}, ${email}, ${department || "Engineering"},
        ${designation || "Project Engineer"}, 'Site Engineer', 'PENDING_APPROVAL'
      )
      ON CONFLICT (email) DO UPDATE SET
        full_name = ${fullName},
        department = ${department || "Engineering"},
        designation = ${designation || "Project Engineer"}
      RETURNING *
    `;

    const user = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          department: user.department,
          designation: user.designation,
          siteLocation: user.site_location,
          mfaEnabled: Boolean(user.mfa_enabled),
          status: user.status,
          role: user.role,
          lastActive: user.last_active,
        },
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
        code: "AUTH_REGISTER_ERROR",
        message: err instanceof Error ? err.message : "User could not be completed",
      },
      meta: null,
    });
  }
}
