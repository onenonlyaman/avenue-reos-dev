import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const PUBLIC_API = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/forgot-password",
  "/api/v1/system/status",
  "/api/v1/system/db-health",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublicPage = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isPublicApi = PUBLIC_API.some((p) => pathname === p);

  if (isPublicPage || isPublicApi) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("avenue_session");
  const isAuthenticated = Boolean(sessionCookie && sessionCookie.value);

  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          status_code: 401,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: {
            code: "UNAUTHORIZED_SESSION",
            message: "Authentication required. Valid session cookie missing.",
          },
          meta: null,
        },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
