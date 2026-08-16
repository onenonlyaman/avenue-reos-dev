-- ============================================================================
-- DB MIGRATION: Enterprise Tally ERP, Multi-Book (System 1 vs System 0),
-- Statutory Compliance & Manufacturing Engine
-- File: apps/web/migrations/011_tally_erp_core_module.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Account Groups (n-Level Hierarchical Chart of Accounts)
CREATE TABLE IF NOT EXISTS tally_account_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    group_code VARCHAR(50) NOT NULL,
    group_name VARCHAR(150) NOT NULL,
    parent_group_id UUID REFERENCES tally_account_groups(id) ON DELETE RESTRICT,
    nature VARCHAR(20) NOT NULL CHECK (nature IN ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE')),
    path TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tally_group_code UNIQUE (tenant_id, group_code)
);

CREATE INDEX IF NOT EXISTS idx_tally_groups_tenant ON tally_account_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tally_groups_parent ON tally_account_groups(parent_group_id);

-- 2. Cost Centers & Categories (Project & Branch Dynamic Allocations)
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

CREATE INDEX IF NOT EXISTS idx_tally_centers_tenant ON tally_cost_centers(tenant_id);

-- 3. Account Ledgers (General Ledger Master with Multi-Book Scope)
CREATE TABLE IF NOT EXISTS tally_account_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    ledger_code VARCHAR(50) NOT NULL,
    ledger_name VARCHAR(150) NOT NULL,
    group_id UUID NOT NULL REFERENCES tally_account_groups(id) ON DELETE RESTRICT,
    book_type VARCHAR(20) NOT NULL DEFAULT 'STATUTORY' CHECK (book_type IN ('STATUTORY', 'INTERNAL')),
    opening_balance NUMERIC(15,2) DEFAULT 0.00,
    opening_balance_type VARCHAR(2) DEFAULT 'Dr' CHECK (opening_balance_type IN ('Dr', 'Cr')),
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
    msme_category VARCHAR(20) CHECK (msme_category IN ('MICRO', 'SMALL', 'MEDIUM', NULL)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tally_ledger_code UNIQUE (tenant_id, ledger_code)
);

CREATE INDEX IF NOT EXISTS idx_tally_ledgers_tenant ON tally_account_ledgers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tally_ledgers_book ON tally_account_ledgers(tenant_id, book_type);
CREATE INDEX IF NOT EXISTS idx_tally_ledgers_group ON tally_account_ledgers(group_id);

-- 4. Vouchers (Header Record with Multi-Book Scope: STATUTORY vs INTERNAL)
CREATE TABLE IF NOT EXISTS tally_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    voucher_number VARCHAR(50) NOT NULL,
    voucher_type VARCHAR(30) NOT NULL CHECK (voucher_type IN (
        'RECEIPT', 'PAYMENT', 'CONTRA', 'JOURNAL', 
        'SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE',
        'DELIVERY_NOTE', 'RECEIPT_NOTE', 'STOCK_JOURNAL', 'PHYSICAL_STOCK'
    )),
    book_type VARCHAR(20) NOT NULL DEFAULT 'STATUTORY' CHECK (book_type IN ('STATUTORY', 'INTERNAL')),
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number VARCHAR(100),
    narration TEXT,
    total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) DEFAULT 'INR',
    exchange_rate NUMERIC(10,4) DEFAULT 1.0000,
    status VARCHAR(20) DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'PENDING_APPROVAL', 'CANCELLED')),
    requires_hitl BOOLEAN DEFAULT FALSE,
    created_by_user_id VARCHAR(100) NOT NULL,
    region_code VARCHAR(10) DEFAULT 'NAS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tally_voucher_num UNIQUE (tenant_id, voucher_number)
);

CREATE INDEX IF NOT EXISTS idx_tally_vouchers_tenant ON tally_vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tally_vouchers_book ON tally_vouchers(tenant_id, book_type);
CREATE INDEX IF NOT EXISTS idx_tally_vouchers_date ON tally_vouchers(tenant_id, voucher_date);
CREATE INDEX IF NOT EXISTS idx_tally_vouchers_type ON tally_vouchers(tenant_id, voucher_type);

-- 5. Voucher Line Items
CREATE TABLE IF NOT EXISTS tally_voucher_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    voucher_id UUID NOT NULL REFERENCES tally_vouchers(id) ON DELETE CASCADE,
    ledger_id UUID NOT NULL REFERENCES tally_account_ledgers(id),
    cost_center_id UUID REFERENCES tally_cost_centers(id),
    entry_type VARCHAR(2) NOT NULL CHECK (entry_type IN ('Dr', 'Cr')),
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    bill_reference VARCHAR(100),
    particulars TEXT,
    line_number INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tally_vitems_tenant ON tally_voucher_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tally_vitems_voucher ON tally_voucher_items(voucher_id);
CREATE INDEX IF NOT EXISTS idx_tally_vitems_ledger ON tally_voucher_items(ledger_id);

-- 6. Bill-by-Bill Reference Engine
CREATE TABLE IF NOT EXISTS tally_bill_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    voucher_id UUID NOT NULL REFERENCES tally_vouchers(id) ON DELETE CASCADE,
    ledger_id UUID NOT NULL REFERENCES tally_account_ledgers(id),
    book_type VARCHAR(20) NOT NULL DEFAULT 'STATUTORY' CHECK (book_type IN ('STATUTORY', 'INTERNAL')),
    bill_number VARCHAR(100) NOT NULL,
    ref_type VARCHAR(20) NOT NULL CHECK (ref_type IN ('NEW_REF', 'AGST_REF', 'ADVANCE', 'ON_ACCOUNT')),
    original_amount NUMERIC(15,2) NOT NULL CHECK (original_amount > 0),
    pending_amount NUMERIC(15,2) NOT NULL,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    is_settled BOOLEAN DEFAULT FALSE,
    interest_rate_pct NUMERIC(5,2) DEFAULT 18.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tally_brefs_tenant ON tally_bill_references(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tally_brefs_ledger ON tally_bill_references(ledger_id);
CREATE INDEX IF NOT EXISTS idx_tally_brefs_settled ON tally_bill_references(tenant_id, is_settled);

-- 7. Physical Cash Register & Vault Denomination Counter (System 0 / Cash Chest)
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
    status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'DISCREPANCY_FLAGGED')),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tally_vault_tenant ON tally_cash_vault_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tally_vault_date ON tally_cash_vault_sessions(tenant_id, session_date);

-- 8. CRM Booking Deal Splits (System 1 Agreement Value vs System 0 Cash Component)
CREATE TABLE IF NOT EXISTS tally_crm_booking_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    booking_id UUID NOT NULL,
    total_deal_value NUMERIC(15,2) NOT NULL,
    agreement_value_statutory NUMERIC(15,2) NOT NULL,
    cash_component_internal NUMERIC(15,2) NOT NULL,
    agreement_pct NUMERIC(5,2) NOT NULL,
    cash_pct NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tally_splits_booking ON tally_crm_booking_splits(booking_id);

-- 9. Inventory Godowns, Stock Items & BOM Recipes
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
    valuation_method VARCHAR(20) DEFAULT 'WEIGHTED_AVG' CHECK (valuation_method IN ('WEIGHTED_AVG', 'FIFO', 'LIFO', 'STANDARD_COST', 'LAST_PURCHASE')),
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
    yield_quantity NUMERIC(15,2) NOT NULL CHECK (yield_quantity > 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tally_bom_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    bom_id UUID NOT NULL REFERENCES tally_bom_recipes(id) ON DELETE CASCADE,
    component_item_id UUID NOT NULL REFERENCES tally_stock_items(id),
    quantity NUMERIC(15,2) NOT NULL CHECK (quantity > 0),
    scrap_rate_pct NUMERIC(5,2) DEFAULT 0.00
);

-- 10. GST E-Invoicing Metadata
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
    status VARCHAR(20) DEFAULT 'GENERATED' CHECK (status IN ('PENDING', 'GENERATED', 'CANCELLED', 'FAILED')),
    error_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. GSTR-2B & IMS Actions
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
    itc_eligibility VARCHAR(20) DEFAULT 'ELIGIBLE' CHECK (itc_eligibility IN ('ELIGIBLE', 'INELIGIBLE')),
    ims_action VARCHAR(20) DEFAULT 'PENDING' CHECK (ims_action IN ('ACCEPT', 'REJECT', 'PENDING')),
    matched_voucher_id UUID REFERENCES tally_vouchers(id),
    reconciliation_status VARCHAR(20) DEFAULT 'UNMATCHED' CHECK (reconciliation_status IN ('MATCHED', 'MISMATCHED', 'UNMATCHED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Bank Statements & e-BRS Transactions
CREATE TABLE IF NOT EXISTS tally_bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    bank_ledger_id UUID NOT NULL REFERENCES tally_account_ledgers(id),
    statement_file_name VARCHAR(255) NOT NULL,
    statement_format VARCHAR(20) NOT NULL CHECK (statement_format IN ('CSV', 'MT940', 'OFX')),
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
    entry_type VARCHAR(2) NOT NULL CHECK (entry_type IN ('Dr', 'Cr')),
    amount NUMERIC(15,2) NOT NULL,
    balance_after NUMERIC(15,2),
    matched_voucher_id UUID REFERENCES tally_vouchers(id),
    match_status VARCHAR(20) DEFAULT 'UNMATCHED' CHECK (match_status IN ('UNMATCHED', 'AUTO_MATCHED', 'MANUAL_MATCHED')),
    match_score NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Statutory Rules Engine (Budget 2026 Framework)
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

-- 14. MCA Mandatory Append-Only Audit Trail
CREATE TABLE IF NOT EXISTS tally_accounting_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    voucher_id UUID NOT NULL,
    modified_by_user_id VARCHAR(100) NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'CANCEL')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    crypto_hash VARCHAR(64),
    old_payload JSONB,
    new_payload JSONB NOT NULL,
    ip_address VARCHAR(45),
    reason_for_change TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION block_tally_audit_alteration()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'MCA Compliance Error: tally_accounting_audit_log is immutable and append-only.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_tally_audit_log ON tally_accounting_audit_log;
CREATE TRIGGER trg_immutable_tally_audit_log
BEFORE UPDATE OR DELETE ON tally_accounting_audit_log
FOR EACH ROW EXECUTE FUNCTION block_tally_audit_alteration();
