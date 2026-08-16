import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { envelope, requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

async function ensureSessionsTable() {
  await runtimeDdl("table:system_sessions", async () => {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS system_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        absolute_expires_at TIMESTAMPTZ NOT NULL,
        user_agent VARCHAR(255),
        ip_address VARCHAR(100),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_system_sessions_token ON system_sessions (token_hash)
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_system_sessions_user ON system_sessions (user_id, revoked_at)
    `;
  });
}

function parseDeviceName(userAgent: string | null): string {
  if (!userAgent || userAgent === "unknown") return "Corporate Workstation";

  let browser = "Web Browser";
  if (userAgent.includes("Edg/")) browser = "Microsoft Edge";
  else if (userAgent.includes("Chrome/") && !userAgent.includes("Chromium/")) browser = "Google Chrome";
  else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) browser = "Apple Safari";
  else if (userAgent.includes("Firefox/")) browser = "Mozilla Firefox";
  else if (userAgent.includes("Postman") || userAgent.includes("curl")) browser = "API Client";

  let os = "Desktop";
  if (userAgent.includes("Windows NT 10.0") || userAgent.includes("Windows NT")) os = "Windows";
  else if (userAgent.includes("Macintosh") || userAgent.includes("Mac OS X")) os = "macOS";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSessionsTable();

    const rows = await prisma.$queryRaw<
      {
        id: string;
        user_agent: string | null;
        ip_address: string | null;
        last_seen_at: Date;
        created_at: Date;
      }[]
    >`
      SELECT id, user_agent, ip_address, last_seen_at, created_at
      FROM system_sessions
      WHERE user_id = ${auth.user.id}::uuid
        AND tenant_id = ${auth.user.tenantId}::uuid
        AND revoked_at IS NULL
        AND expires_at > NOW()
        AND absolute_expires_at > NOW()
      ORDER BY last_seen_at DESC
    `;

    const mapped = (rows || []).map((r) => ({
      id: r.id,
      deviceName: parseDeviceName(r.user_agent),
      ipAddress: r.ip_address || "127.0.0.1",
      lastActiveTimestamp: new Date(r.last_seen_at || r.created_at).toISOString(),
      isCurrentDevice: r.id === auth.sessionId,
    }));

    return envelope(200, {
      data: mapped,
      meta: { total_records: mapped.length },
    });
  } catch (err: unknown) {
    console.error("[users/sessions] fetch failed", err);
    return envelope(500, {
      data: [],
      error: {
        code: "FETCH_SESSIONS_ERROR",
        message: safeErrorMessage(err, "Active device register is temporarily unavailable."),
      },
      meta: { total_records: 0 },
    });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSessionsTable();

    let targetSessionId: string | null = null;

    // Check query params first
    const urlSessionId = request.nextUrl.searchParams.get("id") || request.nextUrl.searchParams.get("sessionId");
    if (urlSessionId) {
      targetSessionId = urlSessionId.trim();
    } else {
      // Check request body if present
      try {
        const body = await request.json();
        if (body && typeof body.sessionId === "string" && body.sessionId.trim()) {
          targetSessionId = body.sessionId.trim();
        }
      } catch {
        // Body is optional; no-body implies revoking all other sessions
      }
    }

    if (targetSessionId) {
      // Cannot revoke current session through this endpoint without calling logout
      if (targetSessionId === auth.sessionId) {
        return envelope(400, {
          error: {
            code: "CANNOT_REVOKE_CURRENT",
            message: "Cannot terminate your active session from this control. Use sign-out instead.",
          },
        });
      }

      await prisma.$executeRaw`
        UPDATE system_sessions
        SET revoked_at = NOW()
        WHERE id = ${targetSessionId}::uuid
          AND user_id = ${auth.user.id}::uuid
          AND tenant_id = ${auth.user.tenantId}::uuid
          AND revoked_at IS NULL
      `;
    } else {
      // Revoke all other active sessions for this user
      await prisma.$executeRaw`
        UPDATE system_sessions
        SET revoked_at = NOW()
        WHERE user_id = ${auth.user.id}::uuid
          AND tenant_id = ${auth.user.tenantId}::uuid
          AND id != ${auth.sessionId}::uuid
          AND revoked_at IS NULL
      `;
    }

    return envelope(200, {
      data: { success: true },
    });
  } catch (err: unknown) {
    console.error("[users/sessions] revocation failed", err);
    return envelope(500, {
      error: {
        code: "REVOKE_SESSIONS_ERROR",
        message: safeErrorMessage(err, "Device revocation could not be completed."),
      },
    });
  }
}
