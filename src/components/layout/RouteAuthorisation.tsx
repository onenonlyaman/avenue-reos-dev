import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@/lib/config";
import { getHomeRouteForRole, isRouteAllowedForRole } from "@/lib/permissions";
import { resolveSession } from "@/lib/session";

const PUBLIC_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Server-side page authorisation.
 *
 * The proxy can only see whether a session cookie is present; it cannot reach the database
 * cheaply enough to know the caller's role. Without this, a signed-in Sales Executive could
 * load the finance screen — every API call behind it returned 403, so no records leaked, but
 * rendering a module the account has no right to is misleading and leaks the shape of the
 * system. This runs before any module markup is produced.
 */
export async function RouteAuthorisation({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get("x-avenue-pathname") ?? "/";

  const isPublicPage = PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isPublicPage || pathname.startsWith("/api/")) {
    return <>{children}</>;
  }

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  const session = await resolveSession(token);
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  if (!isRouteAllowedForRole(session.user.role, pathname)) {
    const homeRoute = getHomeRouteForRole(session.user.role);
    // Prevent redirect loops: only redirect if target is different and verified permitted
    if (pathname !== homeRoute && isRouteAllowedForRole(session.user.role, homeRoute)) {
      redirect(homeRoute);
    }
  }

  return <>{children}</>;
}
