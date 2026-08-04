import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UserProfile } from "@/services/authApi";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function getAuthenticatedUser(request: NextRequest): Promise<UserProfile | null> {
  const sessionCookie = request.cookies.get("avenue_session");
  const headerRole = request.headers.get("X-User-Role");
  const headerName = request.headers.get("X-User-Name");

  if (!sessionCookie && !headerRole) {
    return null;
  }

  try {
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
        role VARCHAR(100) NOT NULL DEFAULT 'Governance Director',
        last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM system_users ORDER BY created_at ASC LIMIT 1
    `;

    if (raw && raw.length > 0) {
      const u = raw[0];
      return {
        id: u.id,
        fullName: headerName || u.full_name,
        email: u.email,
        department: u.department,
        designation: u.designation,
        siteLocation: u.site_location,
        mfaEnabled: Boolean(u.mfa_enabled),
        status: u.status,
        role: headerRole || u.role,
        lastActive: u.last_active,
      };
    }

    return {
      id: ACTIVE_TENANT_ID,
      fullName: headerName || "Aman Bele",
      email: "aman.bele@avenuebuilders.in",
      department: "Executive Administration",
      designation: "Lead Architect",
      siteLocation: "Nashik Corporate HQ",
      mfaEnabled: true,
      status: "ACTIVE",
      role: headerRole || "Governance Director",
      lastActive: new Date().toISOString(),
    };
  } catch {
    return {
      id: ACTIVE_TENANT_ID,
      fullName: headerName || "Aman Bele",
      email: "aman.bele@avenuebuilders.in",
      department: "Executive Administration",
      designation: "Lead Architect",
      siteLocation: "Nashik Corporate HQ",
      mfaEnabled: true,
      status: "ACTIVE",
      role: headerRole || "Governance Director",
      lastActive: new Date().toISOString(),
    };
  }
}

export async function requireAuth(request: NextRequest): Promise<{ user: UserProfile } | NextResponse> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        status_code: 401,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
        meta: null,
      },
      { status: 401 }
    );
  }
  return { user };
}

export async function requireRole(request: NextRequest, allowedRoles: string[]): Promise<{ user: UserProfile } | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { user } = authResult;
  if (!allowedRoles.includes(user.role) && user.role !== "Governance Director") {
    return NextResponse.json(
      {
        success: false,
        status_code: 403,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "FORBIDDEN",
          message: `Access Restricted: Requires one of [${allowedRoles.join(", ")}] permissions`,
        },
        meta: null,
      },
      { status: 403 }
    );
  }

  return { user };
}
