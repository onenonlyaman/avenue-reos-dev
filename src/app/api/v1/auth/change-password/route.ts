import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { envelope, requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "@/lib/password";
import { clientAddress } from "@/lib/session";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const ipAddress = clientAddress(request);

  let currentPassword: unknown;
  let newPassword: unknown;

  try {
    const body = await request.json();
    currentPassword = body?.currentPassword;
    newPassword = body?.newPassword;
  } catch {
    return envelope(400, {
      error: { code: "MALFORMED_REQUEST", message: "Request body must be valid JSON." },
    });
  }

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    !currentPassword ||
    !newPassword
  ) {
    return envelope(400, {
      error: {
        code: "MISSING_CREDENTIALS",
        message: "Current password and new password are required.",
      },
    });
  }

  if (currentPassword === newPassword) {
    return envelope(400, {
      error: {
        code: "SAME_PASSWORD",
        message: "New password cannot be the same as your current password.",
      },
    });
  }

  const policy = checkPasswordPolicy(newPassword);
  if (!policy.valid) {
    return envelope(400, {
      error: {
        code: "WEAK_PASSWORD",
        message: policy.message ?? "Password does not meet corporate security policy.",
      },
    });
  }

  try {
    const rateLimitKey = `pwd-change:${auth.user.id}`;
    const limit = await checkLoginRateLimit(rateLimitKey, ipAddress);
    if (!limit.allowed) {
      const response = envelope(429, {
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message: `Too many password change attempts. Try again in ${Math.ceil(
            limit.retryAfterSeconds / 60
          )} minutes.`,
        },
      });
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }

    const rows = await prisma.$queryRaw<{ id: string; password_hash: string }[]>`
      SELECT id, password_hash
      FROM system_users
      WHERE id = ${auth.user.id}::uuid
      LIMIT 1
    `;

    const userRecord = rows[0];
    if (!userRecord) {
      return envelope(404, {
        error: { code: "USER_NOT_FOUND", message: "User account could not be found." },
      });
    }

    const currentMatches = await verifyPassword(currentPassword, userRecord.password_hash);
    if (!currentMatches) {
      await recordLoginAttempt(rateLimitKey, ipAddress, false);
      return envelope(401, {
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "The current password provided is incorrect.",
        },
      });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE system_users
        SET password_hash = ${newPasswordHash},
            password_changed_at = NOW(),
            must_reset_password = false,
            failed_login_count = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = ${auth.user.id}::uuid
      `;

      await tx.$executeRaw`
        UPDATE system_sessions
        SET revoked_at = NOW()
        WHERE user_id = ${auth.user.id}::uuid
          AND id != ${auth.sessionId}::uuid
          AND revoked_at IS NULL
      `;
    });

    await recordLoginAttempt(rateLimitKey, ipAddress, true);

    return envelope(200, {
      data: {
        success: true,
        message: "Corporate password successfully updated. Other active sessions have been signed out.",
      },
    });
  } catch (err: unknown) {
    console.error("[auth/change-password] failed", err);
    return envelope(503, {
      error: {
        code: "PASSWORD_UPDATE_FAILED",
        message: safeErrorMessage(err, "Password update is temporarily unavailable. Please retry shortly."),
      },
    });
  }
}
