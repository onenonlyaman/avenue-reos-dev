import { NextRequest } from "next/server";
import { envelope, unauthorized } from "@/lib/apiAccess";
import { readSessionToken, resolveSession, touchSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = readSessionToken(request);
  if (!token) return unauthorized();

  try {
    const session = await resolveSession(token);
    if (!session) return unauthorized("Session is invalid or has expired.");

    void touchSession(session.sessionId).catch(() => {});

    const { user } = session;

    return envelope(200, {
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        designation: user.designation,
        siteLocation: user.siteLocation,
        mfaEnabled: user.mfaEnabled,
        status: user.status,
        role: user.role,
        lastActive: user.lastActive,
      },
    });
  } catch (err) {
    console.error("[auth/me] failed", err);
    return envelope(503, {
      error: {
        code: "AUTH_BACKEND_UNAVAILABLE",
        message: "The session profile cannot be verified at the moment.",
      },
    });
  }
}
