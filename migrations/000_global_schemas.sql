CREATE SCHEMA IF NOT EXISTS logs;
CREATE SCHEMA IF NOT EXISTS notification;

CREATE TABLE IF NOT EXISTS logs.platform_audit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(255) NOT NULL,
    dst VARCHAR(255) NOT NULL,
    protocol VARCHAR(50) NOT NULL CHECK (protocol IN ('REST', 'GRPC', 'MCP', 'WEBSOCKET', 'NATS_EVENT', 'INTERNAL_IPC')),
    module VARCHAR(100) NOT NULL,
    submodule VARCHAR(100) NOT NULL,
    error_status_code INTEGER NOT NULL CHECK (error_status_code >= 100 AND error_status_code <= 599),
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs.platform_audit_entries (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_module ON logs.platform_audit_entries (module, submodule);
CREATE INDEX IF NOT EXISTS idx_logs_tenant_status ON logs.platform_audit_entries (tenant_id, error_status_code);

CREATE TABLE IF NOT EXISTS notification.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    src_module VARCHAR(100) NOT NULL,
    user_type VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ALERT', 'APPROVAL_REQUEST', 'INFO', 'WORKFLOW_STEP', 'AI_AGENT_ACTION_REQUIRED')),
    description TEXT NOT NULL,
    action_link VARCHAR(1024) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_user ON notification.system_notifications (tenant_id, user_type, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_priority ON notification.system_notifications (tenant_id, priority);
