#!/usr/bin/env node
/**
 * Non-destructive verification against a live deployment.
 *
 * Unlike scripts/verify-security.mjs this creates no accounts and imports no records,
 * so it is safe to run against production. It signs in once with an existing account
 * and otherwise only probes rejection paths.
 *
 * Usage:
 *   VERIFY_BASE=https://host VERIFY_EMAIL=... VERIFY_PASSWORD=... node scripts/verify-live.mjs
 */

const BASE = process.env.VERIFY_BASE ?? "http://127.0.0.1:3000";
const EMAIL = process.env.VERIFY_EMAIL ?? "";
const PASSWORD = process.env.VERIFY_PASSWORD ?? "";

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
}

async function call(path, options = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", ...options });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, body, headers: res.headers };
}

function cookieFrom(headers) {
  const raw = headers.getSetCookie ? headers.getSetCookie() : [headers.get("set-cookie")];
  for (const c of raw.filter(Boolean)) {
    const m = /avenue_session=([^;]*)/.exec(c);
    if (m && m[1]) return m[1];
  }
  return null;
}

{
  const r = await call("/api/v1/system/health");
  record("liveness probe reachable", r.status === 200, `status=${r.status}`);
}

{
  const r = await call("/api/v1/finance/overview");
  record("anonymous API request rejected", r.status === 401, `status=${r.status}`);
}

{
  const r = await call("/api/v1/users", {
    headers: {
      "X-User-Role": "Governance Director",
      "X-User-Email": "attacker@example.com",
      "X-User-Id": "00000000-0000-0000-0000-000000000001",
    },
  });
  record("identity headers cannot authenticate", r.status === 401, `status=${r.status}`);
}

{
  const r = await call("/api/v1/finance/overview", {
    headers: { cookie: "avenue_session=forged-value-aaaaaaaaaaaaaaaaaaaaaaaa" },
  });
  record("forged session cookie rejected", r.status === 401, `status=${r.status}`);
}

{
  const r = await call("/api/v1/system/db-health");
  record("schema diagnostics require authentication", r.status === 401, `status=${r.status}`);
}

{
  const r = await call("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "nobody.here@example.com", password: "Not-A-Real-Pass!2026" }),
  });
  record(
    "unknown account is not auto-provisioned",
    r.status === 401 && !cookieFrom(r.headers),
    `status=${r.status}`
  );
}

{
  const r = await call("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not json at all",
  });
  record("malformed body returns 400", r.status === 400, `status=${r.status}`);
}

{
  const res = await fetch(BASE + "/finance", { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  record(
    "anonymous page request redirects to sign-in",
    location.includes("/login"),
    `status=${res.status} location=${location}`
  );
}

{
  const res = await fetch(BASE + "/api/v1/system/health");
  record(
    "security headers present",
    res.headers.get("x-content-type-options") === "nosniff" &&
      res.headers.get("x-frame-options") === "DENY",
    ""
  );
  record(
    "API responses are not cacheable",
    /no-store/.test(res.headers.get("cache-control") ?? ""),
    res.headers.get("cache-control") ?? ""
  );
  if (BASE.startsWith("https://")) {
    record(
      "HSTS enabled",
      (res.headers.get("strict-transport-security") ?? "").includes("max-age="),
      res.headers.get("strict-transport-security") ?? "absent"
    );
  }
}

if (EMAIL && PASSWORD) {
  const login = await call("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const cookie = cookieFrom(login.headers);
  record("valid credentials establish a session", login.status === 200 && Boolean(cookie), `status=${login.status}`);

  if (cookie) {
    const auth = { cookie: `avenue_session=${cookie}` };

    const me = await call("/api/v1/auth/me", { headers: auth });
    record(
      "session resolves to the expected account",
      me.status === 200 && me.body?.data?.email?.toLowerCase() === EMAIL.toLowerCase(),
      `status=${me.status} email=${me.body?.data?.email}`
    );

    const users = await call("/api/v1/users", { headers: auth });
    record("administrator can read the user directory", users.status === 200, `status=${users.status}`);

    const health = await call("/api/v1/system/db-health", { headers: auth });
    const migrations = health.body?.data?.appliedMigrationCount ?? 0;
    record("migrations are recorded in the database", migrations >= 11, `applied=${migrations}`);
    record(
      "tenant isolation holds across every register",
      health.body?.data?.tenantIsolationEnforced === true,
      `gaps=${(health.body?.data?.registersWithoutTenantScope ?? []).join(",") || "none"}`
    );

    const units = await call("/api/v1/units", { headers: auth });
    const unitCount = Array.isArray(units.body?.data) ? units.body.data.length : 0;
    record("existing business data is readable", units.status === 200 && unitCount > 0, `units=${unitCount}`);

    const out = await call("/api/v1/auth/logout", { method: "POST", headers: auth });
    const reuse = await call("/api/v1/auth/me", { headers: auth });
    record(
      "logout revokes the session server-side",
      out.status === 200 && reuse.status === 401,
      `logout=${out.status} reuse=${reuse.status}`
    );
  }
} else {
  console.log("SKIP  authenticated checks (set VERIFY_EMAIL and VERIFY_PASSWORD)");
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  for (const f of failed) console.log(`  - ${f.name} (${f.detail})`);
  process.exit(1);
}
