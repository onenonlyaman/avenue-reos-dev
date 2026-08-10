import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { envelope, requireAdmin } from "@/lib/apiAccess";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { checkPasswordPolicy, hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

/**
 * Settings view over the single user register.
 *
 * This endpoint previously read and wrote `user_accounts`, a table unconnected to the
 * `system_users` register that authentication uses — so an account created here could
 * never sign in — and it seeded six invented staff records into the database the first
 * time anyone opened the page. Both behaviours are gone: this is a projection over
 * `system_users`, and it creates nothing on read.
 */

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  last_active: Date | null;
}

function project(u: UserRow) {
  return {
    id: u.id,
    fullName: u.full_name,
    corporateEmail: u.email,
    assignedRole: u.role,
    department: u.department,
    accountStatus: u.status,
    lastActiveDate: u.last_active ? new Date(u.last_active).toISOString().split("T")[0] : null,
  };
}

const SELECT_COLUMNS = "id, full_name, email, role, department, status, last_active";

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
    console.error("[settings/users] list failed", err);
    return envelope(503, {
      data: [],
      error: { code: "USERS_UNAVAILABLE", message: "User accounts could not be loaded." },
      meta: { total_records: 0 },
    });
  }
}

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
  const email =
    typeof body.corporateEmail === "string" ? body.corporateEmail.trim().toLowerCase() : "";
  const assignedRole = typeof body.assignedRole === "string" ? body.assignedRole.trim() : "";
  const department =
    typeof body.department === "string" && body.department.trim()
      ? body.department.trim()
      : "Operations";

  if (!fullName || !email || !assignedRole) {
    return envelope(400, {
      error: {
        code: "MISSING_FIELDS",
        message: "Full name, corporate email and role are required.",
      },
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return envelope(400, {
      error: { code: "INVALID_EMAIL", message: "Enter a valid corporate email address." },
    });
  }

  if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, assignedRole)) {
    return envelope(400, {
      error: {
        code: "UNKNOWN_ROLE",
        message: `"${assignedRole}" is not a role defined by this platform.`,
      },
    });
  }

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
         tenant_id, full_name, email, password_hash, department, designation,
         role, status, mfa_enabled, must_reset_password, password_changed_at
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 'ACTIVE', false, false, NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING ${SELECT_COLUMNS}`,
      ACTIVE_TENANT_ID,
      fullName,
      email,
      passwordHash,
      department,
      assignedRole,
      assignedRole
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
    console.error("[settings/users] provisioning failed", err);
    return envelope(503, {
      error: { code: "USER_PROVISION_FAILED", message: "The user account could not be saved." },
    });
  }
}
