import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

const PUBLIC_API = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/system/health",
];

/**
 * Headers a client must never be able to assert. The previous auth guard read identity
 * and role from headers like these, so they are stripped on every inbound request before
 * the application can observe them.
 */
const SPOOFABLE_IDENTITY_HEADERS = [
  "x-user-id",
  "x-user-role",
  "x-user-email",
  "x-user-name",
  "x-tenant-id",
  "x-avenue-user",
  // Set by this proxy below so the root layout can authorise the route being rendered.
  // Stripped first so a client cannot present a path other than the one it requested.
  "x-avenue-pathname",
];

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  return response;
}

function sanitisedRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  for (const name of SPOOFABLE_IDENTITY_HEADERS) headers.delete(name);
  headers.set("x-avenue-pathname", request.nextUrl.pathname);
  return headers;
}

function forward(request: NextRequest): NextResponse {
  return withSecurityHeaders(
    NextResponse.next({ request: { headers: sanitisedRequestHeaders(request) } })
  );
}

/**
 * Cheap edge gate only.
 *
 * Presence of a session cookie is *not* proof of authentication — every `/api/v1` route
 * handler independently resolves the session against the database via `requireApiAccess`.
 * This layer exists to redirect unauthenticated page requests to the sign-in screen, to
 * short-circuit obviously anonymous API traffic, and to strip spoofable identity headers.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isPublicPage = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isPublicApi = PUBLIC_API.includes(pathname);

  if (isPublicPage || isPublicApi) {
    return forward(request);
  }

  const hasSessionCookie = Boolean(request.cookies.get("avenue_session")?.value);

  if (pathname.startsWith("/api/")) {
    if (!hasSessionCookie) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            status_code: 401,
            timestamp: new Date().toISOString(),
            request_id: `req-${Date.now()}`,
            data: null,
            error: {
              code: "UNAUTHORIZED_SESSION",
              message: "Authentication required.",
            },
            meta: null,
          },
          { status: 401 }
        )
      );
    }
    return forward(request);
  }

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return forward(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
