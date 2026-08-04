CREATE TABLE IF NOT EXISTS construction_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES master_project(id) ON DELETE RESTRICT,
    site_code VARCHAR(100) NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    gps_coordinates VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PREPARATION', 'ACTIVE', 'COMPLETED', 'HALTED')),
    site_engineer_id UUID NOT NULL REFERENCES master_employee(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_code UNIQUE (tenant_id, site_code)
);

CREATE INDEX IF NOT EXISTS idx_site_project ON construction_sites (project_id);
CREATE INDEX IF NOT EXISTS idx_site_engineer ON construction_sites (site_engineer_id);
CREATE INDEX IF NOT EXISTS idx_site_tenant_status ON construction_sites (tenant_id, status);

CREATE TABLE IF NOT EXISTS daily_progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    dpr_code VARCHAR(100) NOT NULL,
    site_id UUID NOT NULL REFERENCES construction_sites(id) ON DELETE RESTRICT,
    report_date DATE NOT NULL,
    submitted_by UUID NOT NULL REFERENCES master_employee(id) ON DELETE RESTRICT,
    labor_count INTEGER NOT NULL CHECK (labor_count >= 0),
    weather_condition VARCHAR(100) NOT NULL,
    progress_percentage NUMERIC(5, 2) NOT NULL CHECK (progress_percentage >= 0.00 AND progress_percentage <= 100.00),
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    work_details_json JSONB NOT NULL,
    photos_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dpr_code UNIQUE (tenant_id, dpr_code)
);

CREATE INDEX IF NOT EXISTS idx_dpr_site ON daily_progress_reports (site_id);
CREATE INDEX IF NOT EXISTS idx_dpr_submitted_by ON daily_progress_reports (submitted_by);
CREATE INDEX IF NOT EXISTS idx_dpr_tenant_status ON daily_progress_reports (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dpr_work_gin ON daily_progress_reports USING GIN (work_details_json);

CREATE TABLE IF NOT EXISTS bill_of_quantities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    boq_code VARCHAR(100) NOT NULL,
    project_id UUID NOT NULL REFERENCES master_project(id) ON DELETE RESTRICT,
    unit_id UUID REFERENCES master_unit(id) ON DELETE RESTRICT,
    item_description TEXT NOT NULL,
    unit_of_measure VARCHAR(50) NOT NULL,
    estimated_quantity NUMERIC(15, 3) NOT NULL CHECK (estimated_quantity >= 0),
    rate_per_unit NUMERIC(15, 2) NOT NULL CHECK (rate_per_unit >= 0),
    total_estimated_amount NUMERIC(15, 2) NOT NULL CHECK (total_estimated_amount >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('ESTIMATED', 'IN_PROGRESS', 'COMPLETED', 'REVISED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_boq_code UNIQUE (tenant_id, boq_code)
);

CREATE INDEX IF NOT EXISTS idx_boq_project ON bill_of_quantities (project_id);
CREATE INDEX IF NOT EXISTS idx_boq_unit ON bill_of_quantities (unit_id);
CREATE INDEX IF NOT EXISTS idx_boq_tenant_status ON bill_of_quantities (tenant_id, status);

CREATE TABLE IF NOT EXISTS quality_ncr_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    ncr_number VARCHAR(100) NOT NULL,
    site_id UUID NOT NULL REFERENCES construction_sites(id) ON DELETE RESTRICT,
    inspector_id UUID NOT NULL REFERENCES master_employee(id) ON DELETE RESTRICT,
    contractor_id UUID REFERENCES master_vendor(id) ON DELETE RESTRICT,
    defect_severity VARCHAR(50) NOT NULL CHECK (defect_severity IN ('MINOR', 'MAJOR', 'CRITICAL')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')),
    description TEXT NOT NULL,
    corrective_action TEXT,
    inspection_details_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ncr_number UNIQUE (tenant_id, ncr_number)
);

CREATE INDEX IF NOT EXISTS idx_ncr_site ON quality_ncr_reports (site_id);
CREATE INDEX IF NOT EXISTS idx_ncr_inspector ON quality_ncr_reports (inspector_id);
CREATE INDEX IF NOT EXISTS idx_ncr_tenant_status ON quality_ncr_reports (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ncr_details_gin ON quality_ncr_reports USING GIN (inspection_details_json);
