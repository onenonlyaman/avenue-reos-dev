CREATE TABLE IF NOT EXISTS master_customer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    customer_code VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    tax_identifier VARCHAR(100),
    customer_type VARCHAR(50) NOT NULL CHECK (customer_type IN ('INDIVIDUAL', 'CORPORATE', 'INVESTOR')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customer_code UNIQUE (tenant_id, customer_code)
);

CREATE INDEX IF NOT EXISTS idx_customer_tenant_status ON master_customer (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_metadata_gin ON master_customer USING GIN (metadata);

CREATE TABLE IF NOT EXISTS master_project (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_code VARCHAR(100) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    total_area_sqft NUMERIC(15, 2) NOT NULL CHECK (total_area_sqft > 0),
    total_budget NUMERIC(15, 2) NOT NULL CHECK (total_budget >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD')),
    start_date DATE NOT NULL,
    expected_completion_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_code UNIQUE (tenant_id, project_code)
);

CREATE INDEX IF NOT EXISTS idx_project_tenant_status ON master_project (tenant_id, status);

CREATE TABLE IF NOT EXISTS master_unit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES master_project(id) ON DELETE RESTRICT,
    unit_number VARCHAR(100) NOT NULL,
    tower_name VARCHAR(100) NOT NULL,
    floor_number INTEGER NOT NULL CHECK (floor_number >= 0),
    unit_type VARCHAR(50) NOT NULL CHECK (unit_type IN ('APARTMENT', 'VILLA', 'COMMERCIAL_BAY', 'PLOT')),
    carpet_area_sqft NUMERIC(10, 2) NOT NULL CHECK (carpet_area_sqft > 0),
    base_price NUMERIC(15, 2) NOT NULL CHECK (base_price >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('AVAILABLE', 'RESERVED', 'BOOKED', 'BLOCKED', 'HANDED_OVER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_unit_number UNIQUE (tenant_id, project_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_unit_project ON master_unit (project_id);
CREATE INDEX IF NOT EXISTS idx_unit_tenant_status ON master_unit (tenant_id, status);

CREATE TABLE IF NOT EXISTS master_vendor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    vendor_code VARCHAR(100) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    vendor_category VARCHAR(100) NOT NULL,
    tax_number VARCHAR(100),
    rating NUMERIC(3, 2) CHECK (rating >= 0.00 AND rating <= 5.00),
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BLACKLISTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vendor_code UNIQUE (tenant_id, vendor_code)
);

CREATE INDEX IF NOT EXISTS idx_vendor_tenant_status ON master_vendor (tenant_id, status);

CREATE TABLE IF NOT EXISTS master_employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_code VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED')),
    joining_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_code UNIQUE (tenant_id, employee_code)
);

CREATE INDEX IF NOT EXISTS idx_employee_tenant_status ON master_employee (tenant_id, status);

CREATE TABLE IF NOT EXISTS master_cost_center (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    cost_center_code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES master_project(id) ON DELETE RESTRICT,
    allocated_budget NUMERIC(15, 2) NOT NULL CHECK (allocated_budget >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'CLOSED', 'FROZEN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cost_center UNIQUE (tenant_id, cost_center_code)
);

CREATE INDEX IF NOT EXISTS idx_cost_center_project ON master_cost_center (project_id);
CREATE INDEX IF NOT EXISTS idx_cost_center_tenant_status ON master_cost_center (tenant_id, status);

CREATE TABLE IF NOT EXISTS master_chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    account_code VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    parent_account_id UUID REFERENCES master_chart_of_accounts(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_account_code UNIQUE (tenant_id, account_code)
);

CREATE INDEX IF NOT EXISTS idx_coa_parent ON master_chart_of_accounts (parent_account_id);
CREATE INDEX IF NOT EXISTS idx_coa_tenant_status ON master_chart_of_accounts (tenant_id, status);
