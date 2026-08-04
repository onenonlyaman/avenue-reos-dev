CREATE TABLE IF NOT EXISTS communication_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    content_markdown_json JSONB NOT NULL,
    pinned_status BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comm_tenant_dest ON communication_messages (tenant_id, destination, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comm_content_gin ON communication_messages USING GIN (content_markdown_json);
CREATE INDEX IF NOT EXISTS idx_comm_pinned ON communication_messages (tenant_id, destination) WHERE pinned_status = TRUE;
