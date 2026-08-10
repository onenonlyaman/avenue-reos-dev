import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { envelope } from "@/lib/apiAccess";
import { clientAddress } from "@/lib/session";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rateLimit";
import { hashResetToken, RESET_TTL_MINUTES } from "@/lib/resetToken";

/**
 * Issues a single-use password reset token.
 *
 * The platform does not ship an outbound mail transport, so the token is written to the
 * server log for an administrator to deliver out of band. The response is identical for
 * registered and unregistered addresses and never contains the token, so this endpoint
 * cannot be used to enumerate accounts or to take one over.
 */
export async function POST(request: NextRequest) {
  const ipAddress = clientAddress(request);

  let email: unknown;
  try {
    email = (await request.json())?.email;
  } catch {
    return envelope(400, {
      error: { code: "MALFORMED_REQUEST", message: "Request body must be valid JSON." },
    });
  }

  if (typeof email !== "string" || !email.trim() || email.length > 255) {
    return envelope(400, {
      error: { code: "INVALID_EMAIL", message: "A valid email address is required." },
    });
  }

  const normalisedEmail = email.trim().toLowerCase();

  const acknowledgement = {
    submitted: true,
    message:
      "If that address belongs to an active account, a reset token has been issued. Your administrator will provide the reset link.",
  };

  try {
    const limit = await checkLoginRateLimit(normalisedEmail, ipAddress);
    if (!limit.allowed) {
      const response = envelope(429, {
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message: "Too many recovery requests. Try again later.",
        },
      });
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }

    await recordLoginAttempt(normalisedEmail, ipAddress, false);

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM system_users
      WHERE LOWER(email) = ${normalisedEmail} AND status = 'ACTIVE'
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      return envelope(202, { data: acknowledgement });
    }

    // Supersede any outstanding token so only the newest one can be redeemed.
    await prisma.$executeRaw`
      UPDATE password_reset_tokens SET consumed_at = NOW()
      WHERE user_id = ${user.id}::uuid AND consumed_at IS NULL
    `;

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await prisma.$executeRaw`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
      VALUES (${user.id}::uuid, ${hashResetToken(token)}, ${expiresAt}, ${ipAddress})
    `;

    console.warn(
      `[auth/forgot-password] reset token issued for user ${user.id}; valid ${RESET_TTL_MINUTES} minutes; link: /reset-password?token=${token}`
    );

    return envelope(202, { data: acknowledgement });
  } catch (err) {
    console.error("[auth/forgot-password] failed", err);
    return envelope(503, {
      error: {
        code: "RECOVERY_UNAVAILABLE",
        message: "Account recovery is unavailable at the moment. Please retry shortly.",
      },
    });
  }
}
