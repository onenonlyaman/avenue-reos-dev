# Deployment runbook

Read this before deploying the hardened build. **Deploying without step 1 will take the
site down**, and **after step 2 the two existing accounts can no longer sign in** until an
administrator password is set. Both are intentional.

## What changed that affects deployment

| Change | Consequence |
|---|---|
| `SESSION_SECRET` is now required | The app refuses to start in production without it |
| Passwords are verified against a real hash | Accounts holding the old `pbkdf2_sha256$default_hash` placeholder cannot sign in |
| Login no longer auto-creates accounts | Unknown email addresses are rejected instead of being provisioned as Governance Director |
| Schema is owned by `migrations/` | `ALLOW_RUNTIME_DDL=false` in production; the app no longer issues DDL per request |
| `middleware.ts` → `src/proxy.ts` | The old file sat beside `src/`, not beside `src/app`, so it was **never registered**. It is now active |

## 1. Add the required environment variables

On the server, in the application directory:

```bash
printf 'SESSION_SECRET="%s"\n' "$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")" >> .env
```

Then confirm `.env` contains `DATABASE_URL`, `NEXT_PUBLIC_AVENUE_TENANT_ID`,
`SESSION_SECRET`, and `ALLOW_RUNTIME_DDL="false"`. Set `COOKIE_SECURE="true"` only once
the site is served over HTTPS — see step 5. See `.env.example` for the full list.

## 2. Back up, then migrate

Back up first. Migration `010` alters `system_users` and cannot be undone by re-running it.

```bash
docker exec avenue_postgres pg_dump -U avenue_admin avenue_reos > ~/avenue_backup_$(date +%F_%H%M).sql
```

The existing database predates the migration runner, so record migrations `000`–`008` as
already applied before running the new ones:

```bash
node scripts/migrate.mjs --status
node scripts/migrate.mjs --baseline 008
node scripts/migrate.mjs
```

`009_runtime_registers.sql` is idempotent (`CREATE TABLE IF NOT EXISTS` throughout) and
creates only registers that were previously created at request time.
`010_auth_hardening.sql` adds the session, reset-token and login-attempt tables, drops the
unsafe column defaults, and flags every account carrying a placeholder password hash.

## 3. Create a real administrator

Both existing production accounts have placeholder hashes and are locked out by design.
Create a usable administrator before announcing the deployment:

```bash
node scripts/manage-admin.mjs create you@avenuebuilders.in "Your Name" "Governance Director"
```

The password is prompted for, or read from `PLATFORM_ADMIN_PASSWORD`. There is no default
credential. Then re-issue passwords for the accounts that should keep working:

```bash
node scripts/manage-admin.mjs list
node scripts/manage-admin.mjs set-password aman.bele@avenuebuilders.in
```

`sales.executive@avenuebuilders.in` currently holds the `Governance Director` role — it was
escalated by the auto-provisioning login defect, not by an administrator. Decide its correct
role and set it, or suspend the account:

```bash
node scripts/manage-admin.mjs suspend sales.executive@avenuebuilders.in
```

## 4. Build

The server has 4 GB of RAM. The default build parallelism (one worker per core) exhausts it.

```bash
NODE_OPTIONS=--max-old-space-size=4096 BUILD_WORKERS=1 npm run build
pm2 restart avenue-app --update-env
```

## 5. Close the network exposure

These are the highest-severity findings and none of them are fixed by the application code.

```bash
# The production database is currently reachable from the whole internet.
ufw delete allow 5432/tcp
ufw delete allow 3306/tcp

# Port 3000 lets callers reach the app directly, bypassing the reverse proxy.
ufw delete allow 3000/tcp
```

Bind the Postgres container to the loopback interface only — in `docker-compose.yml` change
`"5432:5432"` to `"127.0.0.1:5432:5432"`, then `docker compose up -d`.

The site is served over plain HTTP, so passwords and session cookies cross the network in
clear text. Point a domain at the host and replace `/etc/caddy/Caddyfile` with:

```
your-domain.example {
    reverse_proxy localhost:3000
}
```

Caddy obtains a certificate automatically. Only then set `COOKIE_SECURE="true"` and restart.

## 6. Verify

```bash
node scripts/verify-security.mjs     # expects the app on http://127.0.0.1:3311
node scripts/verify-outage.mjs       # expects an instance pointed at an unreachable database
```

Adjust the `BASE` constant in each script to match the port you are testing.
