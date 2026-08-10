import { prisma } from "@/lib/db";
import { LOGIN_ATTEMPT_WINDOW_MINUTES, LOGIN_MAX_ATTEMPTS } from "@/lib/config";

export interface RateLimitVerdict {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Counts failed credential attempts in the rolling window for both the supplied
 * identifier (email) and the calling address, so neither a single account nor a single
 * origin can be brute forced. Backed by the database rather than process memory so the
 * limit still holds across restarts and multiple application instances.
 */
export async function checkLoginRateLimit(
  identifier: string,
  ipAddress: string
): Promise<RateLimitVerdict> {
  const windowMinutes = LOGIN_ATTEMPT_WINDOW_MINUTES;

  const rows = await prisma.$queryRaw<{ identifier_failures: bigint; ip_failures: bigint }[]>`
    SELECT
      COUNT(*) FILTER (WHERE identifier = ${identifier.toLowerCase()}) AS identifier_failures,
      COUNT(*) FILTER (WHERE ip_address = ${ipAddress}) AS ip_failures
    FROM auth_login_attempts
    WHERE succeeded = false
      AND attempted_at > NOW() - (${windowMinutes} * INTERVAL '1 minute')
  `;

  const row = rows[0];
  const identifierFailures = Number(row?.identifier_failures ?? 0);
  const ipFailures = Number(row?.ip_failures ?? 0);

  const allowed =
    identifierFailures < LOGIN_MAX_ATTEMPTS && ipFailures < LOGIN_MAX_ATTEMPTS * 5;

  return { allowed, retryAfterSeconds: allowed ? 0 : windowMinutes * 60 };
}

export async function recordLoginAttempt(
  identifier: string,
  ipAddress: string,
  succeeded: boolean
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO auth_login_attempts (identifier, ip_address, succeeded)
      VALUES (${identifier.toLowerCase()}, ${ipAddress}, ${succeeded})
    `;
  } catch (err) {
    console.error("[rateLimit] could not record login attempt", err);
  }
}

export async function purgeOldLoginAttempts(): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM auth_login_attempts WHERE attempted_at < NOW() - INTERVAL '7 days'
    `;
  } catch {
    // Housekeeping only: never fail a request because pruning could not run.
  }
}
