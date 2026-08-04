CREATE TABLE IF NOT EXISTS construction_wbs_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES master_project(id) ON DELETE RESTRICT,
    milestone_code VARCHAR(100) NOT NULL,
    execution_phase VARCHAR(255) NOT NULL,
    milestone_title VARCHAR(255) NOT NULL,
    phase_weightage_pct NUMERIC(5, 2) NOT NULL DEFAULT 25.00,
    physical_completion_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    target_start_date DATE NOT NULL,
    target_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    assigned_contractor VARCHAR(255) NOT NULL,
    financial_allocation NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL CHECK (status IN ('COMPLETED', 'IN_PROGRESS', 'DELAYED', 'PENDING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wbs_code UNIQUE (tenant_id, milestone_code)
);

CREATE INDEX IF NOT EXISTS idx_wbs_project ON construction_wbs_milestones (project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tenant_status ON construction_wbs_milestones (tenant_id, status);

CREATE TABLE IF NOT EXISTS contractor_ra_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES master_project(id) ON DELETE RESTRICT,
    bill_reference VARCHAR(100) NOT NULL,
    contractor_name VARCHAR(255) NOT NULL,
    wbs_phase VARCHAR(255) NOT NULL,
    gross_claim_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    verified_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    retained_holdback_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    net_payable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    claimed_progress_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    verified_progress_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    requires_hitl BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ra_bill_ref UNIQUE (tenant_id, bill_reference)
);

CREATE INDEX IF NOT EXISTS idx_ra_bill_project ON contractor_ra_bills (project_id);
CREATE INDEX IF NOT EXISTS idx_ra_bill_tenant_status ON contractor_ra_bills (tenant_id, status);
