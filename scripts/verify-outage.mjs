const BASE = 'http://127.0.0.1:3313';
const results = [];
function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
}
async function call(path, options = {}) {
  const res = await fetch(BASE + path, { redirect: 'manual', ...options });
  let body = null;
  let text = '';
  try { text = await res.text(); body = JSON.parse(text); } catch {}
  return { status: res.status, body, text };
}

for (let i = 0; i < 90; i += 1) {
  try { const r = await fetch(BASE + '/api/v1/system/health'); if (r.status) break; } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}

{
  const r = await call('/api/v1/system/health');
  record('health probe reports the outage as 503 degraded', r.status === 503 && r.body?.status === 'degraded', `status=${r.status} ${JSON.stringify(r.body)}`);
}

{
  const r = await call('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'clean.admin@avenuebuilders.in', password: 'Clean-Verify!2026' }),
  });
  const leaksInternals = /password|prisma|postgres|ECONNREFUSED|localhost:5999/i.test(JSON.stringify(r.body ?? {}));
  record('sign-in fails explicitly during an outage', r.status === 503 && r.body?.error?.code === 'AUTH_BACKEND_UNAVAILABLE', `status=${r.status} code=${r.body?.error?.code}`);
  record('outage response does not leak connection internals', !leaksInternals, JSON.stringify(r.body?.error ?? {}));
}

{
  // A request carrying a session cookie must fail closed, never fall back to a default user.
  const r = await call('/api/v1/finance/overview', {
    headers: { cookie: 'avenue_session=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
  });
  const hasRows = Array.isArray(r.body?.data) && r.body.data.length > 0;
  record('data endpoint fails closed during an outage', (r.status === 503 || r.status === 401) && !hasRows, `status=${r.status} code=${r.body?.error?.code}`);
  record('no records are fabricated during an outage', !hasRows, `rows=${Array.isArray(r.body?.data) ? r.body.data.length : 'n/a'}`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { for (const f of failed) console.log(`  - ${f.name}`); process.exit(1); }
