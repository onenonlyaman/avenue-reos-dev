-- Migration 014: Runtime Tally ERP & HR Payroll Registers
-- Consolidates all tables previously created dynamically inside route handlers.

-- 1. Tally Account Groups
CREATE TABLE IF NOT EXISTS tally_account_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    group_code VARCHAR(50) NOT NULL,
    group_name VARCHAR(150) NOT NULL,
    parent_group_id UUID REFERENCES tally_account_groups(id) ON DELETE RESTRICT,
    nature VARCHAR(20) NOT NULL DEFAULT 'ASSET',
    path TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tally_group_code UNIQUE (tenant_id, group_code)
);

CREATE INDEX IF NOT EXISTS idx_tally_group_tenant ON tally_account_groups (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tally_group_parent ON tally_account_groups (parent_group_id);

-- 2. Tally Cost Centers
CREATE TABLE IF NOT EXISTS tally_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    center_code VARCHAR(50) NOT NULL,
    center_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) DEFAULT 'PROJECT',
    region_code VARCHAR(10) DEFAULT 'NAS',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tally_center_code UNIQUE (tenant_id, center_code)
);

CREATE INDEX IF NOT EXISTS idx_tally_cost_center_tenant ON tally_cost_centers (tenant_id);

-- 3. Tally Account Ledgers
CREATE TABLE IF NOT EXISTS tally_account_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    ledger_code VARCHAR(50) NOT NULL,
    ledger_name VARCHAR(150) NOT NULL,
    group_id UUID NOT NULL REFERENCES tally_account_groups(id) ON DELETE RESTRICT,
    book_type VARCHAR(20) NOT NULL DEFAULT 'STATUTORY',
    opening_balance NUMERIC(15,2) DEFAULT 0.00,
    opening_balance_type VARCHAR(2) DEFAULT 'Dr',
    current_balance NUMERIC(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'INR',
    gstin VARCHAR(20),
    pan VARCHAR(20),
    hsn_sac_code VARCHAR(10),
    is_tds_applicable BOOLEAN DEFAULT FALSE,
    tds_section VARCHAR(20),
    bank_account_number VARCHAR(50),
    bank_ifsc_code VARCHAR(20),
    credit_period_days INT DEFAULT 30,
    is_msme BOOLEAN DEFAULT FALSE,
    msme_category VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tally_ledger_code UNIQUE (tenant_id, ledger_code)
);

CREATE INDEX IF NOT EXISTS idx_tally_ledger_tenant ON tally_account_ledgers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tally_ledger_group ON tally_account_ledgers (group_id);

-- 4. Tally Vouchers
CREATE TABLE IF NOT EXISTS tally_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    voucher_number VARCHAR(50) NOT NULL,
    voucher_type VARCHAR(30) NOT NULL,
    book_type VARCHAR(20) NOT NULL DEFAULT 'STATUTORY',
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    posting_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    narration TEXT,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'INR',
    exchange_rate NUMERIC(10,4) DEFAULT 1.0000,
    status VARCHAR(20) DEFAULT 'POSTED',
    requires_hitl BOOLEAN DEFAULT FALSE,
    created_by_user_id VARCHAR(100) NOT NULL DEFAULT 'usr-default',
    region_code VARCHAR(10) DEFAULT 'NAS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tally_voucher_num UNIQUE (tenant_id, voucher_number)
);

CREATE INDEX IF NOT EXISTS idx_tally_voucher_tenant_date ON tally_vouchers (tenant_id, voucher_date);
CREATE INDEX IF NOT EXISTS idx_tally_voucher_status ON tally_vouchers (status);

-- 5. Tally Voucher Items
CREATE TABLE IF NOT EXISTS tally_voucher_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    voucher_id UUID NOT NULL REFERENCES tally_vouchers(id) ON DELETE CASCADE,
    ledger_id UUID NOT NULL REFERENCES tally_account_ledgers(id),
    cost_center_id UUID REFERENCES tally_cost_centers(id),
    entry_type VARCHAR(2) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    bill_reference VARCHAR(100),
    particulars TEXT,
    line_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tally_vitem_voucher ON tally_voucher_items (voucher_id);
CREATE INDEX IF NOT EXISTS idx_tally_vitem_ledger ON tally_voucher_items (ledger_id);

-- 6. Tally Bill References
CREATE TABLE IF NOT EXISTS tally_bill_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    voucher_id UUID NOT NULL REFERENCES tally_vouchers(id) ON DELETE CASCADE,
    ledger_id UUID NOT NULL REFERENCES tally_account_ledgers(id),
    book_type VARCHAR(20) NOT NULL DEFAULT 'STATUTORY',
    bill_number VARCHAR(100) NOT NULL,
    ref_type VARCHAR(20) NOT NULL,
    original_amount NUMERIC(15,2) NOT NULL,
    pending_amount NUMERIC(15,2) NOT NULL,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    is_settled BOOLEAN DEFAULT FALSE,
    interest_rate_pct NUMERIC(5,2) DEFAULT 18.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tally_billref_tenant ON tally_bill_references (tenant_id, bill_number);

-- 7. Tally Cash Vault Sessions
CREATE TABLE IF NOT EXISTS tally_cash_vault_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    cashier_user_id VARCHAR(100) NOT NULL,
    cashier_name VARCHAR(150),
    opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    notes_500 INT DEFAULT 0,
    notes_200 INT DEFAULT 0,
    notes_100 INT DEFAULT 0,
    notes_50 INT DEFAULT 0,
    notes_20 INT DEFAULT 0,
    notes_10 INT DEFAULT 0,
    coins_total NUMERIC(10,2) DEFAULT 0.00,
    physical_counted_total NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    system_expected_total NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    variance_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'OPEN',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tally_vault_tenant ON tally_cash_vault_sessions (tenant_id, session_date);

-- 8. Tally CRM Booking Splits
CREATE TABLE IF NOT EXISTS tally_crm_booking_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    booking_id UUID NOT NULL,
    total_deal_value NUMERIC(15,2) NOT NULL,
    agreement_value_statUTORY NUMERIC(15,2) NOT NULL,
    cash_component_internal NUMERIC(15,2) NOT NULL,
    agreement_pct NUMERIC(5,2) NOT NULL,
    cash_pct NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tally_crm_split_tenant ON tally_crm_booking_splits (tenant_id, booking_id);

-- 9. Tally Inventory Godowns & Items & BOM
CREATE TABLE IF NOT EXISTS tally_inventory_godowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    godown_code VARCHAR(50) NOT NULL,
    godown_name VARCHAR(150) NOT NULL,
    location_address TEXT,
    parent_godown_id UUID REFERENCES tally_inventory_godowns(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tally_godown_code UNIQUE (tenant_id, godown_code)
);

CREATE TABLE IF NOT EXISTS tally_stock_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    group_code VARCHAR(50) NOT NULL,
    group_name VARCHAR(150) NOT NULL,
    parent_group_id UUID REFERENCES tally_stock_groups(id),
    CONSTRAINT uq_tally_sgroup_code UNIQUE (tenant_id, group_code)
);

CREATE TABLE IF NOT EXISTS tally_stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    group_id UUID REFERENCES tally_stock_groups(id),
    uom VARCHAR(20) NOT NULL DEFAULT 'NOS',
    hsn_code VARCHAR(10),
    gst_rate NUMERIC(5,2) DEFAULT 18.00,
    reorder_level NUMERIC(15,2) DEFAULT 0,
    reorder_quantity NUMERIC(15,2) DEFAULT 0,
    valuation_method VARCHAR(20) DEFAULT 'WEIGHTED_AVG',
    current_stock NUMERIC(15,2) DEFAULT 0.00,
    standard_rate NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tally_sitem_code UNIQUE (tenant_id, item_code)
);

CREATE TABLE IF NOT EXISTS tally_bom_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    bom_name VARCHAR(150) NOT NULL,
    finished_item_id UUID NOT NULL REFERENCES tally_stock_items(id),
    yield_quantity NUMERIC(15,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tally_bom_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    bom_id UUID NOT NULL REFERENCES tally_bom_recipes(id) ON DELETE CASCADE,
    component_item_id UUID NOT NULL REFERENCES tally_stock_items(id),
    quantity NUMERIC(15,2) NOT NULL,
    scrap_rate_pct NUMERIC(5,2) DEFAULT 0.00
);

-- 10. Tally GST E-Invoices & Reconciliations
CREATE TABLE IF NOT EXISTS tally_gst_e_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    voucher_id UUID NOT NULL UNIQUE REFERENCES tally_vouchers(id) ON DELETE CASCADE,
    irn VARCHAR(64) UNIQUE,
    ack_number VARCHAR(50),
    ack_date TIMESTAMPTZ,
    signed_qr_code TEXT,
    signed_invoice_payload JSONB,
    eway_bill_number VARCHAR(50),
    eway_bill_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'GENERATED',
    error_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tally_gst_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    vendor_gstin VARCHAR(20) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    taxable_value NUMERIC(15,2) NOT NULL,
    igst_amount NUMERIC(15,2) DEFAULT 0.00,
    cgst_amount NUMERIC(15,2) DEFAULT 0.00,
    sgst_amount NUMERIC(15,2) DEFAULT 0.00,
    itc_eligibility VARCHAR(20) DEFAULT 'ELIGIBLE',
    ims_action VARCHAR(20) DEFAULT 'PENDING',
    matched_voucher_id UUID REFERENCES tally_vouchers(id),
    reconciliation_status VARCHAR(20) DEFAULT 'UNMATCHED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tally Bank Statements & e-BRS
CREATE TABLE IF NOT EXISTS tally_bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    bank_ledger_id UUID NOT NULL REFERENCES tally_account_ledgers(id),
    statement_file_name VARCHAR(255) NOT NULL,
    statement_format VARCHAR(20) NOT NULL,
    uploaded_by_user_id VARCHAR(100),
    total_transactions INT DEFAULT 0,
    reconciled_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tally_bank_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    statement_id UUID NOT NULL REFERENCES tally_bank_statements(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    value_date DATE,
    reference_number VARCHAR(100),
    description TEXT,
    entry_type VARCHAR(2) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    balance_after NUMERIC(15,2),
    matched_voucher_id UUID REFERENCES tally_vouchers(id),
    match_status VARCHAR(20) DEFAULT 'UNMATCHED',
    match_score NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Tally Statutory Rules Engine & MCA Audit Log
CREATE TABLE IF NOT EXISTS tally_statutory_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    rule_category VARCHAR(50) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    rule_payload JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tally_rule_code UNIQUE (tenant_id, rule_code)
);

CREATE TABLE IF NOT EXISTS tally_accounting_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    voucher_id UUID NOT NULL,
    modified_by_user_id VARCHAR(100) NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    crypto_hash VARCHAR(64),
    old_payload JSONB,
    new_payload JSONB NOT NULL,
    ip_address VARCHAR(45),
    reason_for_change TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. HR Payroll Items & Registers
CREATE TABLE IF NOT EXISTS hr_payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    payroll_run_id UUID NOT NULL,
    employee_id UUID,
    employee_name VARCHAR(255) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    basic_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
    allowances NUMERIC(15,2) NOT NULL DEFAULT 0,
    gross_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
    pf_deduction NUMERIC(15,2) NOT NULL DEFAULT 0,
    esic_deduction NUMERIC(15,2) NOT NULL DEFAULT 0,
    pt_deduction NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_items_tenant_run ON hr_payroll_items (tenant_id, payroll_run_id);
