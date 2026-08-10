const BASE = 'http://127.0.0.1:3311';
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
}

async function call(path, options = {}) {
  const res = await fetch(BASE + path, { redirect: 'manual', ...options });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body, headers: res.headers };
}

function cookieFrom(headers) {
  const raw = headers.getSetCookie ? headers.getSetCookie() : [headers.get('set-cookie')];
  for (const c of raw.filter(Boolean)) {
    const m = /avenue_session=([^;]*)/.exec(c);
    if (m && m[1]) return m[1];
  }
  return null;
}

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(BASE + '/api/v1/system/health');
      if (r.status === 200 || r.status === 503) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('server did not come up');
}

const ADMIN = 'audit.admin@avenuebuilders.in';
const ADMIN_PW = 'Aud1t-Verify!2026';

await waitForServer();

// 1. Public liveness probe.
{
  const r = await call('/api/v1/system/health');
  record('health probe is public and reports real state', r.status === 200 && r.body?.database === 'reachable', `status=${r.status}`);
}

// 2. Unauthenticated API access is rejected.
{
  const r = await call('/api/v1/finance/overview');
  record('unauthenticated API request rejected', r.status === 401, `status=${r.status}`);
}

// 3. Header spoofing must not authenticate.
{
  const r = await call('/api/v1/users', {
    headers: { 'X-User-Role': 'Governance Director', 'X-User-Email': ADMIN, 'X-User-Id': '1' },
  });
  record('X-User-Role header cannot authenticate', r.status === 401, `status=${r.status}`);
}

// 4. Forged session cookie must not authenticate.
{
  const r = await call('/api/v1/finance/overview', {
    headers: { cookie: 'avenue_session=forged-value-aaaaaaaaaaaaaaaaaaaa' },
  });
  record('forged session cookie rejected', r.status === 401, `status=${r.status}`);
}

// 5. system/status is no longer public.
{
  const r = await call('/api/v1/system/status');
  record('system/status requires authentication', r.status === 401, `status=${r.status}`);
}

// 6. Login with a wrong password.
{
  const r = await call('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN, password: 'definitely-not-the-password' }),
  });
  record('wrong password rejected with 401', r.status === 401 && !cookieFrom(r.headers), `status=${r.status}`);
}

// 7. Unknown account does not auto-provision.
{
  const email = `ghost.${Date.now()}@avenuebuilders.in`;
  const r = await call('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Whatever-Pass!2026' }),
  });
  record('unknown account is not auto-created on login', r.status === 401 && !cookieFrom(r.headers), `status=${r.status}`);
}

// 8. Legacy placeholder-hash account cannot sign in.
{
  const r = await call('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'aman.bele@avenuebuilders.in', password: 'anything-at-all-1A!' }),
  });
  record('legacy placeholder-hash account cannot sign in', r.status === 401 || r.status === 403, `status=${r.status} code=${r.body?.error?.code}`);
}

// 9. Correct login issues an httpOnly session cookie.
let adminCookie = null;
{
  const r = await call('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN, password: ADMIN_PW }),
  });
  adminCookie = cookieFrom(r.headers);
  const raw = r.headers.getSetCookie ? r.headers.getSetCookie().join(';') : '';
  record('valid credentials establish a session', r.status === 200 && Boolean(adminCookie), `status=${r.status}`);
  record('session cookie is httpOnly', /HttpOnly/i.test(raw), '');
  record('login response does not leak a bearer token', !JSON.stringify(r.body ?? {}).includes('sessionToken'), '');
}

const auth = { cookie: `avenue_session=${adminCookie}` };

// 10. Authenticated request succeeds.
{
  const r = await call('/api/v1/auth/me', { headers: auth });
  record('authenticated /auth/me returns the session user', r.status === 200 && r.body?.data?.email === ADMIN, `status=${r.status} email=${r.body?.data?.email}`);
}

// 11. Admin can read the user directory.
{
  const r = await call('/api/v1/users', { headers: auth });
  record('admin can read the user directory', r.status === 200 && Array.isArray(r.body?.data), `status=${r.status}`);
}

// 12. Reading settings/users must not write anything to the database.
{
  const first = await call('/api/v1/settings/users', { headers: auth });
  const countBefore = (first.body?.data ?? []).length;
  const second = await call('/api/v1/settings/users', { headers: auth });
  const countAfter = (second.body?.data ?? []).length;
  record(
    'reading settings/users creates no records',
    first.status === 200 && countBefore === countAfter,
    `before=${countBefore} after=${countAfter}`
  );
  // The legacy demo accounts predate this work; they are inert (no usable password hash)
  // but they are still present in the database and are reported as a remaining risk.
  const legacy = (second.body?.data ?? []).filter((u) =>
    ['Rahul Sharma', 'Priya Kulkarni', 'Vikram Patil', 'Neha Deshmukh', 'Suresh Mehta'].includes(u.fullName)
  );
  console.log(`NOTE  pre-existing demo accounts still in database: ${legacy.length}`);
}

// 13. Provisioning without a password is refused.
{
  const r = await call('/api/v1/users', {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'No Password', email: `nopw.${Date.now()}@avenuebuilders.in`, role: 'Site Engineer' }),
  });
  record('account creation without a password is refused', r.status === 400 && r.body?.error?.code === 'WEAK_PASSWORD', `status=${r.status} code=${r.body?.error?.code}`);
}

// 14. Provisioning with an undefined role is refused.
{
  const r = await call('/api/v1/users', {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Bad Role', email: `badrole.${Date.now()}@avenuebuilders.in`, role: 'ROOT', initialPassword: 'Str0ng-Pass!2026' }),
  });
  record('undefined role is refused', r.status === 400 && r.body?.error?.code === 'UNKNOWN_ROLE', `status=${r.status} code=${r.body?.error?.code}`);
}

// 15. Provision a low-privilege user and check role enforcement.
const engineerEmail = `engineer.${Date.now()}@avenuebuilders.in`;
const engineerPw = 'Engin33r-Pass!2026';
{
  const r = await call('/api/v1/users', {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Verification Engineer', email: engineerEmail, role: 'Site Engineer', initialPassword: engineerPw }),
  });
  record('admin can provision a Site Engineer', r.status === 201, `status=${r.status} ${r.body?.error?.message ?? ''}`);
}

let engineerCookie = null;
{
  const r = await call('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: engineerEmail, password: engineerPw }),
  });
  engineerCookie = cookieFrom(r.headers);
  record('provisioned account can sign in', r.status === 200 && Boolean(engineerCookie), `status=${r.status}`);
}

const engAuth = { cookie: `avenue_session=${engineerCookie}` };

{
  const r = await call('/api/v1/construction/wbs', { headers: engAuth });
  record('Site Engineer may read its own module', r.status === 200, `status=${r.status}`);
}
{
  const r = await call('/api/v1/finance/overview', { headers: engAuth });
  record('Site Engineer is denied the finance module', r.status === 403, `status=${r.status}`);
}
{
  const r = await call('/api/v1/users', { headers: engAuth });
  record('Site Engineer is denied the user directory', r.status === 403, `status=${r.status}`);
}
{
  const r = await call('/api/v1/users', {
    method: 'POST',
    headers: { ...engAuth, 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Escalate', email: `esc.${Date.now()}@x.in`, role: 'Governance Director', initialPassword: 'Str0ng-Pass!2026' }),
  });
  record('Site Engineer cannot create an administrator', r.status === 403, `status=${r.status}`);
}
{
  const r = await call('/api/v1/system/db-health', { headers: engAuth });
  record('Site Engineer is denied schema diagnostics', r.status === 403, `status=${r.status}`);
}

// 16. Self-registration cannot mint an active administrator.
{
  const email = `selfreg.${Date.now()}@avenuebuilders.in`;
  const r = await call('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Self Registrant', email, password: 'Str0ng-Pass!2026', role: 'Governance Director', status: 'ACTIVE' }),
  });
  const login = await call('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Str0ng-Pass!2026' }),
  });
  record('registration returns an acknowledgement only', r.status === 201 && !r.body?.data?.user, `status=${r.status}`);
  record('self-registered account cannot sign in until approved', login.status === 403 && login.body?.error?.code === 'ACCOUNT_NOT_ACTIVE', `status=${login.status} code=${login.body?.error?.code}`);
}

// 17. Weak password refused at registration.
{
  const r = await call('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Weak', email: `weak.${Date.now()}@avenuebuilders.in`, password: 'password' }),
  });
  record('weak password refused at registration', r.status === 400 && r.body?.error?.code === 'WEAK_PASSWORD', `status=${r.status}`);
}

// 18. Malformed request bodies.
{
  const r = await call('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'this is not json',
  });
  record('malformed JSON returns 400 not 500', r.status === 400, `status=${r.status}`);
}

// 19. Statement import no longer fabricates a transaction.
{
  const r = await call('/api/v1/finance/tally/banking/e-brs', {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ filename: 'x.csv', rawData: 'dummy,data' }),
  });
  record('unparseable bank statement is rejected, not fabricated', r.status === 422, `status=${r.status} code=${r.body?.error?.code}`);
}
{
  const csv = 'date,description,reference,amount,type\n2026-08-01,Test credit,UTR12345,1000.50,CREDIT';
  const r = await call('/api/v1/finance/tally/banking/e-brs', {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ filename: 'verify.csv', rawData: csv }),
  });
  const after = await call('/api/v1/finance/tally/banking/e-brs', { headers: auth });
  const item = (after.body?.data?.brsItems ?? []).find((i) => i.referenceNumber === 'UTR12345');
  record('valid statement line is imported as supplied', r.status === 201 && item?.amount === 1000.5, `status=${r.status} amount=${item?.amount}`);
  record('imported line is not claimed as reconciled', item?.status === 'UNRECONCILED' && item?.matchConfidencePct === 0, `status=${item?.status} confidence=${item?.matchConfidencePct}`);
}

// 20. Error envelopes carry a real HTTP status.
{
  const r = await call('/api/v1/users', {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  record('error envelope HTTP status matches its body', r.status === 400 && r.body?.status_code === 400, `http=${r.status} body=${r.body?.status_code}`);
}

// 21. Security headers.
{
  const r = await fetch(BASE + '/api/v1/system/health');
  record('security headers present', r.headers.get('x-content-type-options') === 'nosniff' && r.headers.get('x-frame-options') === 'DENY', '');
  const cache = r.headers.get('cache-control') ?? '';
  record('API responses are marked no-store', /no-store/.test(cache), cache);
}

// 22. Logout revokes the session server-side.
{
  const out = await call('/api/v1/auth/logout', { method: 'POST', headers: engAuth });
  const after = await call('/api/v1/auth/me', { headers: engAuth });
  record('logout revokes the session server-side', out.status === 200 && after.status === 401, `logout=${out.status} reuse=${after.status}`);
}

// 23. Rate limiting on repeated failures.
{
  const email = `ratelimit.${Date.now()}@avenuebuilders.in`;
  let sawLimit = false;
  for (let i = 0; i < 12; i += 1) {
    const r = await call('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: `bad-attempt-${i}` }),
    });
    if (r.status === 429) { sawLimit = true; break; }
  }
  record('repeated failed sign-ins are rate limited', sawLimit, '');
}

// 24. Page routes redirect anonymous users.
{
  const r = await fetch(BASE + '/finance', { redirect: 'manual' });
  const location = r.headers.get('location') ?? '';
  record('anonymous page request redirects to sign-in', r.status === 307 || r.status === 302 || location.includes('/login'), `status=${r.status} location=${location}`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED CHECKS:');
  for (const f of failed) console.log(`  - ${f.name} (${f.detail})`);
  process.exit(1);
}
