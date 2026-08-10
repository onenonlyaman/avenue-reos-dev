import { createHmac, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  COOKIE_SECURE,
  SESSION_ABSOLUTE_TTL_HOURS,
  SESSION_COOKIE_NAME,
  SESSION_SECRET,
  SESSION_TTL_HOURS,
} from "@/lib/config";

export interface SessionUser {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  department: string;
  designation: string;
  siteLocation: string;
  mfaEnabled: boolean;
  status: string;
  role: string;
  lastActive: string;
}

export interface ResolvedSession {
  sessionId: string;
  user: SessionUser;
  expiresAt: Date;
}

const TOKEN_BYTES = 32;

function fingerprint(token: string): string {
  return createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function readSessionToken(request: NextRequest): string | null {
  const value = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!value || value.length < 16 || value.length > 512) return null;
  return value;
}

export function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 100);
  }
  return request.headers.get("x-real-ip")?.slice(0, 100) ?? "unknown";
}

export async function createSession(
  userId: string,
  tenantId: string,
  request: NextRequest
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = fingerprint(token);
  const expiresAt = hoursFromNow(SESSION_TTL_HOURS);
  const absoluteExpiresAt = hoursFromNow(SESSION_ABSOLUTE_TTL_HOURS);
  const userAgent = (request.headers.get("user-agent") ?? "unknown").slice(0, 255);
  const ipAddress = clientAddress(request);

  await prisma.$executeRaw`
    INSERT INTO system_sessions (
      user_id, tenant_id, token_hash, expires_at, absolute_expires_at, user_agent, ip_address
    ) VALUES (
      ${userId}::uuid, ${tenantId}::uuid, ${tokenHash}, ${expiresAt}, ${absoluteExpiresAt},
      ${userAgent}, ${ipAddress}
    )
  `;

  return { token, expiresAt };
}

export async function resolveSession(token: string): Promise<ResolvedSession | null> {
  const tokenHash = fingerprint(token);

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      s.id            AS session_id,
      s.expires_at    AS expires_at,
      u.id            AS user_id,
      u.tenant_id     AS tenant_id,
      u.full_name     AS full_name,
      u.email         AS email,
      u.department    AS department,
      u.designation   AS designation,
      u.site_location AS site_location,
      u.mfa_enabled   AS mfa_enabled,
      u.status        AS status,
      u.role          AS role,
      u.last_active   AS last_active
    FROM system_sessions s
    JOIN system_users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
      AND s.absolute_expires_at > NOW()
      AND u.status = 'ACTIVE'
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    sessionId: String(row.session_id),
    expiresAt: new Date(row.expires_at as string),
    user: {
      id: String(row.user_id),
      tenantId: String(row.tenant_id),
      fullName: String(row.full_name),
      email: String(row.email),
      department: String(row.department),
      designation: String(row.designation),
      siteLocation: String(row.site_location),
      mfaEnabled: Boolean(row.mfa_enabled),
      status: String(row.status),
      role: String(row.role),
      lastActive: row.last_active
        ? new Date(row.last_active as string).toISOString()
        : new Date().toISOString(),
    },
  };
}

export async function touchSession(sessionId: string): Promise<void> {
  const nextExpiry = hoursFromNow(SESSION_TTL_HOURS);
  await prisma.$executeRaw`
    UPDATE system_sessions
    SET last_seen_at = NOW(),
        expires_at = LEAST(${nextExpiry}::timestamptz, absolute_expires_at)
    WHERE id = ${sessionId}::uuid
      AND revoked_at IS NULL
      AND last_seen_at < NOW() - INTERVAL '60 seconds'
  `;
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE system_sessions SET revoked_at = NOW()
    WHERE token_hash = ${fingerprint(token)} AND revoked_at IS NULL
  `;
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE system_sessions SET revoked_at = NOW()
    WHERE user_id = ${userId}::uuid AND revoked_at IS NULL
  `;
}

export async function purgeExpiredSessions(): Promise<number> {
  return prisma.$executeRaw`
    DELETE FROM system_sessions
    WHERE absolute_expires_at < NOW() - INTERVAL '30 days'
       OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')
  `;
}

export function applySessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
