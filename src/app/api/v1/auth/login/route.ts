import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { envelope } from "@/lib/apiAccess";
import { burnPasswordComparison, verifyPassword } from "@/lib/password";
import { applySessionCookie, clientAddress, createSession } from "@/lib/session";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rateLimit";
import { LOGIN_MAX_ATTEMPTS } from "@/lib/config";

interface CredentialRow {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  password_hash: string;
  department: string;
  designation: string;
  site_location: string;
  mfa_enabled: boolean;
  status: string;
  role: string;
  last_active: Date | null;
  must_reset_password: boolean;
  locked_until: Date | null;
}

const GENERIC_FAILURE = "Email address or password is incorrect.";

export async function POST(request: NextRequest) {
  const ipAddress = clientAddress(request);

  let email: unknown;
  let password: unknown;

  try {
    const body = await request.json();
    email = body?.email;
    password = body?.password;
  } catch {
    return envelope(400, {
      error: { code: "MALFORMED_REQUEST", message: "Request body must be valid JSON." },
    });
  }

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return envelope(400, {
      error: { code: "INVALID_CREDENTIALS", message: "Email and password are required." },
    });
  }

  const normalisedEmail = email.trim().toLowerCase();

  if (normalisedEmail.length > 255 || password.length > 256) {
    return envelope(400, {
      error: { code: "INVALID_CREDENTIALS", message: "Submitted credentials are out of range." },
    });
  }

  try {
    const limit = await checkLoginRateLimit(normalisedEmail, ipAddress);
    if (!limit.allowed) {
      const response = envelope(429, {
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message: `Too many failed sign-in attempts. Try again in ${Math.ceil(
            limit.retryAfterSeconds / 60
          )} minutes.`,
        },
      });
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }

    const rows = await prisma.$queryRaw<CredentialRow[]>`
      SELECT id, tenant_id, full_name, email, password_hash, department, designation,
             site_location, mfa_enabled, status, role, last_active, must_reset_password,
             locked_until
      FROM system_users
      WHERE LOWER(email) = ${normalisedEmail}
      LIMIT 1
    `;

    const user = rows[0];

    // No account: still perform a password comparison so response timing does not
    // disclose whether the address is registered.
    if (!user) {
      await burnPasswordComparison();
      await recordLoginAttempt(normalisedEmail, ipAddress, false);
      return envelope(401, { error: { code: "INVALID_CREDENTIALS", message: GENERIC_FAILURE } });
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      await recordLoginAttempt(normalisedEmail, ipAddress, false);
      return envelope(423, {
        error: {
          code: "ACCOUNT_LOCKED",
          message: "This account is temporarily locked. Contact your administrator.",
        },
      });
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);

    if (!passwordMatches) {
      await recordLoginAttempt(normalisedEmail, ipAddress, false);
      await prisma.$executeRaw`
        UPDATE system_users
        SET failed_login_count = failed_login_count + 1,
            locked_until = CASE
              WHEN failed_login_count + 1 >= ${LOGIN_MAX_ATTEMPTS} THEN NOW() + INTERVAL '15 minutes'
              ELSE locked_until
            END
        WHERE id = ${user.id}::uuid
      `;
      return envelope(401, { error: { code: "INVALID_CREDENTIALS", message: GENERIC_FAILURE } });
    }

    if (user.must_reset_password) {
      await recordLoginAttempt(normalisedEmail, ipAddress, false);
      return envelope(403, {
        error: {
          code: "PASSWORD_RESET_REQUIRED",
          message: "This account requires a password reset before it can be used.",
        },
      });
    }

    if (user.status !== "ACTIVE") {
      await recordLoginAttempt(normalisedEmail, ipAddress, false);
      return envelope(403, {
        error: {
          code: "ACCOUNT_NOT_ACTIVE",
          message:
            user.status === "PENDING_APPROVAL"
              ? "This account is awaiting administrator approval."
              : "This account is not active.",
        },
      });
    }

    const { token, expiresAt } = await createSession(user.id, user.tenant_id, request);

    await prisma.$executeRaw`
      UPDATE system_users
      SET last_active = NOW(), failed_login_count = 0, locked_until = NULL
      WHERE id = ${user.id}::uuid
    `;

    await recordLoginAttempt(normalisedEmail, ipAddress, true);

    const response = envelope(200, {
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
          lastActive: new Date().toISOString(),
        },
      },
    });

    applySessionCookie(response, token, expiresAt);
    return response;
  } catch (err) {
    console.error("[auth/login] failed", err);
    return envelope(503, {
      error: {
        code: "AUTH_BACKEND_UNAVAILABLE",
        message: "Sign-in is unavailable at the moment. Please retry shortly.",
      },
    });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
