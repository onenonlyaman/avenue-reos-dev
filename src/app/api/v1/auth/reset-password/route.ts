import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { envelope } from "@/lib/apiAccess";
import { checkPasswordPolicy, hashPassword } from "@/lib/password";
import { clientAddress, revokeAllSessionsForUser } from "@/lib/session";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rateLimit";
import { hashResetToken } from "@/lib/resetToken";

const GENERIC_FAILURE = "This reset link is invalid or has expired.";

export async function POST(request: NextRequest) {
  const ipAddress = clientAddress(request);

  let token: unknown;
  let password: unknown;
  try {
    const body = await request.json();
    token = body?.token;
    password = body?.password;
  } catch {
    return envelope(400, {
      error: { code: "MALFORMED_REQUEST", message: "Request body must be valid JSON." },
    });
  }

  if (typeof token !== "string" || token.length < 16 || token.length > 512) {
    return envelope(400, { error: { code: "INVALID_RESET_TOKEN", message: GENERIC_FAILURE } });
  }

  const policy = checkPasswordPolicy(password);
  if (!policy.valid) {
    return envelope(400, {
      error: { code: "WEAK_PASSWORD", message: policy.message ?? "Password does not meet policy." },
    });
  }

  try {
    const limit = await checkLoginRateLimit(`reset:${ipAddress}`, ipAddress);
    if (!limit.allowed) {
      const response = envelope(429, {
        error: { code: "TOO_MANY_ATTEMPTS", message: "Too many attempts. Try again later." },
      });
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }

    const passwordHash = await hashPassword(password as string);

    // Redeem the token and rotate the credential in one transaction so a token can never
    // be spent twice, even under concurrent requests.
    const userId = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string; user_id: string }[]>`
        SELECT id, user_id FROM password_reset_tokens
        WHERE token_hash = ${hashResetToken(token as string)}
          AND consumed_at IS NULL
          AND expires_at > NOW()
        FOR UPDATE
        LIMIT 1
      `;

      const record = rows[0];
      if (!record) return null;

      await tx.$executeRaw`
        UPDATE password_reset_tokens SET consumed_at = NOW() WHERE id = ${record.id}::uuid
      `;

      await tx.$executeRaw`
        UPDATE system_users
        SET password_hash = ${passwordHash},
            password_changed_at = NOW(),
            must_reset_password = false,
            failed_login_count = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = ${record.user_id}::uuid
      `;

      return record.user_id;
    });

    if (!userId) {
      await recordLoginAttempt(`reset:${ipAddress}`, ipAddress, false);
      return envelope(400, { error: { code: "INVALID_RESET_TOKEN", message: GENERIC_FAILURE } });
    }

    // A credential change invalidates every existing session for that account.
    await revokeAllSessionsForUser(userId);
    await recordLoginAttempt(`reset:${ipAddress}`, ipAddress, true);

    return envelope(200, {
      data: { updated: true, message: "Password updated. Sign in with your new credentials." },
    });
  } catch (err) {
    console.error("[auth/reset-password] failed", err);
    return envelope(503, {
      error: {
        code: "RECOVERY_UNAVAILABLE",
        message: "Password reset is unavailable at the moment. Please retry shortly.",
      },
    });
  }
}
