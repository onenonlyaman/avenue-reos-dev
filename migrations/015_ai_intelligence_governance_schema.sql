-- Migration 015: AI Intelligence Governance Schema Enhancements
-- Adds audit columns, relational target linking, and rejection reasons to AI Intelligence tables.

ALTER TABLE ai_intelligence_approvals ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE ai_intelligence_approvals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE ai_intelligence_approvals ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE ai_intelligence_approvals ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ai_approvals_tenant ON ai_intelligence_approvals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_approvals_status ON ai_intelligence_approvals (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_docs_tenant ON ai_documents_legal (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_safety_tenant ON ai_construction_safety (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_finance_tenant ON ai_finance_procurement (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_risk_tenant ON ai_risk_market (tenant_id);
