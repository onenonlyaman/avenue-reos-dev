import { NextRequest, NextResponse } from "next/server";
import { UserProfile } from "@/services/authApi";
import { readSessionToken, resolveSession, SessionUser } from "@/lib/session";
import { ADMIN_ROLES, forbidden, requireApiAccess, unauthorized } from "@/lib/apiAccess";

export function toUserProfile(user: SessionUser): UserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    department: user.department,
    designation: user.designation,
    siteLocation: user.siteLocation,
    mfaEnabled: user.mfaEnabled,
    status: user.status as UserProfile["status"],
    role: user.role,
    lastActive: user.lastActive,
  };
}

/**
 * Resolves the caller from the server-side session record only.
 *
 * Returns null when there is no valid session. There is deliberately no fallback
 * identity: an unauthenticated or unresolvable request must fail, never degrade into
 * a default administrator.
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<UserProfile | null> {
  const token = readSessionToken(request);
  if (!token) return null;

  const session = await resolveSession(token);
  if (!session) return null;

  return toUserProfile(session.user);
}

export async function requireAuth(
  request: NextRequest
): Promise<{ user: UserProfile } | NextResponse> {
  const result = await requireApiAccess(request);
  if (result instanceof NextResponse) return result;
  return { user: toUserProfile(result.user) };
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ user: UserProfile } | NextResponse> {
  const token = readSessionToken(request);
  if (!token) return unauthorized();

  const session = await resolveSession(token);
  if (!session) return unauthorized("Session is invalid or has expired.");

  const { role } = session.user;
  if (!allowedRoles.includes(role) && !ADMIN_ROLES.has(role)) {
    return forbidden(
      `Access restricted. Requires one of [${allowedRoles.join(", ")}]. Current role: ${role}.`
    );
  }

  return { user: toUserProfile(session.user) };
}
