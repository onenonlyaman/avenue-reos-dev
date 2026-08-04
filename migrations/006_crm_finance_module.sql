CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    lead_code VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    lead_source VARCHAR(100) NOT NULL,
    budget_min NUMERIC(15, 2) NOT NULL CHECK (budget_min >= 0),
    budget_max NUMERIC(15, 2) NOT NULL CHECK (budget_max >= budget_min),
    status VARCHAR(50) NOT NULL CHECK (status IN ('NEW', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'QUALIFIED', 'LOST', 'CONVERTED')),
    assigned_rep_id UUID REFERENCES master_employee(id) ON DELETE RESTRICT,
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    interaction_history_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lead_code UNIQUE (tenant_id, lead_code)
);

CREATE INDEX IF NOT EXISTS idx_leads_rep ON crm_leads (assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON crm_leads (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_history_gin ON crm_leads USING GIN (interaction_history_json);

CREATE TABLE IF NOT EXISTS sales_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    booking_code VARCHAR(100) NOT NULL,
    customer_id UUID NOT NULL REFERENCES master_customer(id) ON DELETE RESTRICT,
    unit_id UUID NOT NULL REFERENCES master_unit(id) ON DELETE RESTRICT,
    sales_rep_id UUID NOT NULL REFERENCES master_employee(id) ON DELETE RESTRICT,
    agreed_total_price NUMERIC(15, 2) NOT NULL CHECK (agreed_total_price >= 0),
    booking_deposit_amount NUMERIC(15, 2) NOT NULL CHECK (booking_deposit_amount >= 0),
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00 CHECK (discount_percentage >= 0.00 AND discount_percentage <= 100.00),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'CANCELLED', 'POSSESSION_HANDED_OVER')),
    approved_by UUID REFERENCES master_employee(id) ON DELETE RESTRICT,
    payment_plan_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_booking_code UNIQUE (tenant_id, booking_code)
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON sales_bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_unit ON sales_bookings (unit_id);
CREATE INDEX IF NOT EXISTS idx_bookings_rep ON sales_bookings (sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status ON sales_bookings (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_plan_gin ON sales_bookings USING GIN (payment_plan_json);

CREATE TABLE IF NOT EXISTS general_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    voucher_number VARCHAR(100) NOT NULL,
    transaction_date DATE NOT NULL,
    account_id UUID NOT NULL REFERENCES master_chart_of_accounts(id) ON DELETE RESTRICT,
    cost_center_id UUID REFERENCES master_cost_center(id) ON DELETE RESTRICT,
    debit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0),
    credit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0),
    narration TEXT NOT NULL,
    source_module VARCHAR(100) NOT NULL,
    source_reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ledger_balance CHECK (debit_amount > 0 OR credit_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_gl_account ON general_ledger_entries (account_id);
CREATE INDEX IF NOT EXISTS idx_gl_cost_center ON general_ledger_entries (cost_center_id);
CREATE INDEX IF NOT EXISTS idx_gl_tenant_date ON general_ledger_entries (tenant_id, transaction_date DESC);

CREATE TABLE IF NOT EXISTS budget_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    budget_code VARCHAR(100) NOT NULL,
    cost_center_id UUID NOT NULL REFERENCES master_cost_center(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(15, 2) NOT NULL CHECK (allocated_amount >= 0),
    committed_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (committed_amount >= 0),
    actual_spent_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (actual_spent_amount >= 0),
    fiscal_year VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'EXHAUSTED', 'FROZEN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_budget_head UNIQUE (tenant_id, budget_code)
);

CREATE INDEX IF NOT EXISTS idx_budget_cost_center ON budget_heads (cost_center_id);
CREATE INDEX IF NOT EXISTS idx_budget_tenant_status ON budget_heads (tenant_id, status);
