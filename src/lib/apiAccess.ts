import { NextRequest, NextResponse } from "next/server";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { IS_PRODUCTION } from "@/lib/config";
import { readSessionToken, resolveSession, touchSession, SessionUser } from "@/lib/session";

const ADMIN_ROLES = new Set(["Governance Director", "Super Admin", "SUPER_ADMIN"]);

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Maps an `/api/v1/<segment>` namespace onto the navigation prefixes declared in
 * ROLE_PERMISSIONS, so API authorisation and page authorisation can never drift apart.
 *
 * `null` means "any authenticated user may read"; writes to those namespaces still
 * require one of `writePrefixes`.
 */
interface NamespaceRule {
  readPrefixes: string[] | null;
  writePrefixes: string[];
}

const NAMESPACE_RULES: Record<string, NamespaceRule> = {
  crm: { readPrefixes: ["/crm"], writePrefixes: ["/crm"] },
  sales: { readPrefixes: ["/crm"], writePrefixes: ["/crm"] },
  finance: { readPrefixes: ["/finance"], writePrefixes: ["/finance"] },
  analytics: { readPrefixes: ["/analytics"], writePrefixes: ["/analytics"] },
  construction: { readPrefixes: ["/construction"], writePrefixes: ["/construction"] },
  procurement: { readPrefixes: ["/procurement"], writePrefixes: ["/procurement"] },
  facility: { readPrefixes: ["/facility"], writePrefixes: ["/facility"] },
  hr: { readPrefixes: ["/hr"], writePrefixes: ["/hr"] },
  legal: { readPrefixes: ["/legal"], writePrefixes: ["/legal"] },
  communications: { readPrefixes: ["/communications"], writePrefixes: ["/communications"] },
  mcp: { readPrefixes: ["/mcp"], writePrefixes: ["/mcp"] },
  "ai-intelligence": { readPrefixes: ["/ai-intelligence"], writePrefixes: ["/ai-intelligence"] },
  integrations: { readPrefixes: ["/integrations"], writePrefixes: ["/integrations"] },
  settings: { readPrefixes: ["/settings"], writePrefixes: ["/settings"] },
  users: { readPrefixes: ["/users"], writePrefixes: ["/users"] },

  system: { readPrefixes: null, writePrefixes: ["/settings"] },
  dashboard: { readPrefixes: null, writePrefixes: ["/settings"] },
  search: { readPrefixes: null, writePrefixes: ["/settings"] },
  projects: { readPrefixes: null, writePrefixes: ["/construction", "/crm"] },
  units: { readPrefixes: null, writePrefixes: ["/construction", "/crm"] },
};

export function apiNamespaceFor(pathname: string): string | null {
  const match = /^\/api\/v1\/([^/?#]+)/.exec(pathname);
  return match ? match[1] : null;
}

function roleHoldsPrefix(role: string, prefixes: string[]): boolean {
  if (ADMIN_ROLES.has(role)) return true;

  const rule = ROLE_PERMISSIONS[role];
  if (!rule) return false;
  if (rule.allowedPrefixes.includes("*")) return true;

  return prefixes.some((prefix) => rule.allowedPrefixes.includes(prefix));
}

export function isApiCallAllowedForRole(role: string, method: string, pathname: string): boolean {
  const namespace = apiNamespaceFor(pathname);
  if (!namespace) return false;

  const rule = NAMESPACE_RULES[namespace];
  if (!rule) {
    // Unknown namespace: deny by default rather than inherit a permissive fallback.
    return ADMIN_ROLES.has(role);
  }

  if (READ_METHODS.has(method)) {
    return rule.readPrefixes === null || roleHoldsPrefix(role, rule.readPrefixes);
  }

  return roleHoldsPrefix(role, rule.writePrefixes);
}

export function envelope(
  status: number,
  body: {
    data?: unknown;
    error?: { code: string; message: string } | null;
    meta?: unknown;
  }
): NextResponse {
  return NextResponse.json(
    {
      success: status >= 200 && status < 300,
      status_code: status,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: body.data ?? null,
      error: body.error ?? null,
      meta: body.meta ?? null,
    },
    { status }
  );
}

/**
 * Chooses what a client is told about a failure.
 *
 * The underlying error is always logged server-side. In production the caller receives
 * only the business-level fallback: raw driver text leaks table names, column names,
 * constraint names and connection strings, all of which are useful to an attacker and
 * meaningless to a user. Outside production the detail is appended to aid debugging.
 */
export function safeErrorMessage(err: unknown, fallback: string): string {
  console.error(`[api] ${fallback}`, err);
  if (IS_PRODUCTION) return fallback;
  return err instanceof Error ? `${fallback} (${err.message})` : fallback;
}

export function unauthorized(message = "Authentication required."): NextResponse {
  return envelope(401, { error: { code: "UNAUTHORIZED_SESSION", message } });
}

export function forbidden(message: string): NextResponse {
  return envelope(403, { error: { code: "FORBIDDEN", message } });
}

export interface AuthenticatedContext {
  user: SessionUser;
  sessionId: string;
}

/**
 * Single authorisation choke point for every `/api/v1` route handler.
 *
 * Identity is derived exclusively from the server-side session record keyed by the
 * httpOnly session cookie. Nothing about the caller's identity or role is ever read
 * from a request header or a client-writable cookie.
 */
export async function requireApiAccess(
  request: NextRequest
): Promise<AuthenticatedContext | NextResponse> {
  const token = readSessionToken(request);
  if (!token) return unauthorized();

  let session;
  try {
    session = await resolveSession(token);
  } catch (err) {
    console.error("[auth] session lookup failed", err);
    return envelope(503, {
      error: {
        code: "AUTH_BACKEND_UNAVAILABLE",
        message: "Sessions cannot be verified at the moment. Please retry shortly.",
      },
    });
  }

  if (!session) return unauthorized("Session is invalid or has expired.");

  // Every register in this deployment is scoped to ACTIVE_TENANT_ID. Reject a session
  // belonging to any other tenant rather than letting it read this tenant's records.
  if (session.user.tenantId !== ACTIVE_TENANT_ID) {
    return forbidden("This account does not belong to the tenant served by this deployment.");
  }

  void touchSession(session.sessionId).catch(() => {});

  const { pathname } = request.nextUrl;
  if (!isApiCallAllowedForRole(session.user.role, request.method, pathname)) {
    return forbidden(
      `Access restricted. The ${session.user.role} role is not authorised for this operation.`
    );
  }

  return { user: session.user, sessionId: session.sessionId };
}

/**
 * Additional gate for operations that must be performed by an administrator regardless
 * of which namespace they live under (role assignment, tenant configuration, overrides).
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthenticatedContext | NextResponse> {
  const result = await requireApiAccess(request);
  if (result instanceof NextResponse) return result;
  if (!ADMIN_ROLES.has(result.user.role)) {
    return forbidden("This operation requires Governance Director authority.");
  }
  return result;
}

export { ADMIN_ROLES };
