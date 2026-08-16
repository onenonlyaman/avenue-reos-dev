import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { envelope, requireAdmin } from "@/lib/apiAccess";
import { ROLE_PERMISSIONS, findRoleRule } from "@/lib/permissions";
import { checkPasswordPolicy, hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  site_location: string;
  mfa_enabled: boolean;
  status: string;
  role: string;
  last_active: Date | null;
  must_reset_password: boolean;
}

function project(u: UserRow) {
  return {
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    department: u.department,
    designation: u.designation,
    siteLocation: u.site_location,
    mfaEnabled: Boolean(u.mfa_enabled),
    status: u.status,
    role: u.role,
    mustResetPassword: Boolean(u.must_reset_password),
    lastActive: u.last_active ? new Date(u.last_active).toISOString() : null,
  };
}

const SELECT_COLUMNS = `id, full_name, email, department, designation, site_location,
   mfa_enabled, status, role, last_active, must_reset_password`;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const raw = await prisma.$queryRawUnsafe<UserRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM system_users WHERE tenant_id = $1::uuid ORDER BY created_at DESC`,
      ACTIVE_TENANT_ID
    );

    const mapped = raw.map(project);

    return envelope(200, { data: mapped, meta: { total_records: mapped.length } });
  } catch (err) {
    console.error("[users] list failed", err);
    return envelope(503, {
      data: [],
      error: { code: "USERS_UNAVAILABLE", message: "The user directory could not be loaded." },
      meta: { total_records: 0 },
    });
  }
}

/**
 * Provisions an account. Administrator only.
 *
 * The role must be one the platform actually defines, and an initial password meeting
 * policy is mandatory — there is no default credential and no auto-activation without one.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return envelope(400, {
      error: { code: "MALFORMED_REQUEST", message: "Request body must be valid JSON." },
    });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawRole = typeof body.role === "string" ? body.role.trim() : "";
  const department = typeof body.department === "string" && body.department.trim()
    ? body.department.trim()
    : "Operations";
  const designation = typeof body.designation === "string" && body.designation.trim()
    ? body.designation.trim()
    : "Associate";
  const siteLocation = typeof body.siteLocation === "string" && body.siteLocation.trim()
    ? body.siteLocation.trim()
    : "Nashik Corporate Office";

  if (!fullName || !email || !rawRole) {
    return envelope(400, {
      error: { code: "MISSING_FIELDS", message: "Full name, email and role are required." },
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return envelope(400, { error: { code: "INVALID_EMAIL", message: "Enter a valid email address." } });
  }

  const matchedRule = findRoleRule(rawRole);
  if (!matchedRule) {
    return envelope(400, {
      error: {
        code: "UNKNOWN_ROLE",
        message: `"${rawRole}" is not a role defined by this platform.`,
      },
    });
  }
  const role = matchedRule.roleName;

  const policy = checkPasswordPolicy(body.initialPassword);
  if (!policy.valid) {
    return envelope(400, {
      error: {
        code: "WEAK_PASSWORD",
        message: `An initial password is required. ${policy.message ?? ""}`.trim(),
      },
    });
  }

  try {
    const passwordHash = await hashPassword(body.initialPassword as string);

    const inserted = await prisma.$queryRawUnsafe<UserRow[]>(
      `INSERT INTO system_users (
         tenant_id, full_name, email, password_hash, department, designation, site_location,
         role, status, mfa_enabled, must_reset_password, password_changed_at
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', false, false, NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING ${SELECT_COLUMNS}`,
      ACTIVE_TENANT_ID,
      fullName,
      email,
      passwordHash,
      department,
      designation,
      siteLocation,
      role
    );

    if (inserted.length === 0) {
      return envelope(409, {
        error: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: "An account already exists for that email address.",
        },
      });
    }

    return envelope(201, { data: project(inserted[0]) });
  } catch (err) {
    console.error("[users] provisioning failed", err);
    return envelope(503, {
      error: { code: "USER_PROVISION_FAILED", message: "The account could not be created." },
    });
  }
}
