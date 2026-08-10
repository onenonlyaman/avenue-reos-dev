-- 010_auth_hardening.sql
-- Replaces the ad-hoc, request-time `system_users` definition with a real identity schema:
-- server-side sessions, password reset tokens and login throttling.
--
-- Idempotent and non-destructive. No rows are deleted. Accounts carrying the historic
-- placeholder password hash are flagged `must_reset_password` and cannot authenticate
-- until an administrator sets a real password (scripts/manage-admin.mjs).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- system_users
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  department VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  site_location VARCHAR(255) NOT NULL DEFAULT 'Nashik Corporate Office',
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
  role VARCHAR(100) NOT NULL DEFAULT 'Site Engineer',
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE system_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- A blank password must never be silently acceptable, and self-registration must never
-- be able to inherit an administrative role from a column default.
ALTER TABLE system_users ALTER COLUMN password_hash DROP DEFAULT;
ALTER TABLE system_users ALTER COLUMN role SET DEFAULT 'Site Engineer';
ALTER TABLE system_users ALTER COLUMN status SET DEFAULT 'PENDING_APPROVAL';
ALTER TABLE system_users ALTER COLUMN mfa_enabled SET DEFAULT false;

-- Accounts created by the previous auto-provisioning login path hold a placeholder hash.
-- They are retained but cannot authenticate until a real password is set.
UPDATE system_users
SET must_reset_password = true
WHERE password_hash NOT LIKE 'scrypt$%';

CREATE UNIQUE INDEX IF NOT EXISTS uq_system_users_tenant_email
  ON system_users (tenant_id, LOWER(email));
CREATE INDEX IF NOT EXISTS idx_system_users_tenant_status
  ON system_users (tenant_id, status);

-- ---------------------------------------------------------------------------
-- system_sessions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS system_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES system_users (id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  absolute_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent VARCHAR(255) NOT NULL DEFAULT 'unknown',
  ip_address VARCHAR(100) NOT NULL DEFAULT 'unknown'
);

CREATE INDEX IF NOT EXISTS idx_system_sessions_user ON system_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_system_sessions_expiry ON system_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- password_reset_tokens
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES system_users (id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  requested_ip VARCHAR(100) NOT NULL DEFAULT 'unknown'
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id);

-- ---------------------------------------------------------------------------
-- auth_login_attempts  (rate limiting for credential endpoints)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id BIGSERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  ip_address VARCHAR(100) NOT NULL DEFAULT 'unknown',
  succeeded BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier
  ON auth_login_attempts (identifier, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip
  ON auth_login_attempts (ip_address, attempted_at DESC);

COMMIT;
