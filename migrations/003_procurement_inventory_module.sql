CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    pr_number VARCHAR(100) NOT NULL,
    project_id UUID NOT NULL REFERENCES master_project(id) ON DELETE RESTRICT,
    requested_by UUID NOT NULL REFERENCES master_employee(id) ON DELETE RESTRICT,
    cost_center_id UUID REFERENCES master_cost_center(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
    total_estimated_cost NUMERIC(15, 2) NOT NULL CHECK (total_estimated_cost >= 0),
    items_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pr_number UNIQUE (tenant_id, pr_number)
);

CREATE INDEX IF NOT EXISTS idx_pr_project ON purchase_requisitions (project_id);
CREATE INDEX IF NOT EXISTS idx_pr_requested_by ON purchase_requisitions (requested_by);
CREATE INDEX IF NOT EXISTS idx_pr_tenant_status ON purchase_requisitions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pr_items_gin ON purchase_requisitions USING GIN (items_json);

CREATE TABLE IF NOT EXISTS request_for_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rfq_number VARCHAR(100) NOT NULL,
    pr_id UUID REFERENCES purchase_requisitions(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('OPEN', 'EVALUATING', 'AWARDED', 'CLOSED', 'CANCELLED')),
    vendors_invited JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rfq_number UNIQUE (tenant_id, rfq_number)
);

CREATE INDEX IF NOT EXISTS idx_rfq_pr ON request_for_quotations (pr_id);
CREATE INDEX IF NOT EXISTS idx_rfq_tenant_status ON request_for_quotations (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rfq_vendors_gin ON request_for_quotations USING GIN (vendors_invited);

CREATE TABLE IF NOT EXISTS legacy_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    po_number VARCHAR(100) NOT NULL,
    rfq_id UUID REFERENCES request_for_quotations(id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES master_vendor(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES master_project(id) ON DELETE RESTRICT,
    cost_center_id UUID NOT NULL REFERENCES master_cost_center(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ISSUED', 'FULFILLED', 'CANCELLED')),
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    delivery_date DATE NOT NULL,
    items_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_legacy_po_number UNIQUE (tenant_id, po_number)
);

CREATE INDEX IF NOT EXISTS idx_legacy_po_vendor ON legacy_purchase_orders (vendor_id);
CREATE INDEX IF NOT EXISTS idx_legacy_po_project ON legacy_purchase_orders (project_id);
CREATE INDEX IF NOT EXISTS idx_legacy_po_cost_center ON legacy_purchase_orders (cost_center_id);
CREATE INDEX IF NOT EXISTS idx_legacy_po_tenant_status ON legacy_purchase_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_legacy_po_items_gin ON legacy_purchase_orders USING GIN (items_json);

CREATE TABLE IF NOT EXISTS material_receipt_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    mrn_number VARCHAR(100) NOT NULL,
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES master_project(id) ON DELETE RESTRICT,
    received_by UUID NOT NULL REFERENCES master_employee(id) ON DELETE RESTRICT,
    delivery_challan_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('RECEIVED', 'INSPECTED', 'ACCEPTED', 'REJECTED')),
    received_items_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_mrn_number UNIQUE (tenant_id, mrn_number)
);

CREATE INDEX IF NOT EXISTS idx_mrn_po ON material_receipt_notes (po_id);
CREATE INDEX IF NOT EXISTS idx_mrn_project ON material_receipt_notes (project_id);
CREATE INDEX IF NOT EXISTS idx_mrn_tenant_status ON material_receipt_notes (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mrn_items_gin ON material_receipt_notes USING GIN (received_items_json);

CREATE TABLE IF NOT EXISTS material_issue_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    mis_number VARCHAR(100) NOT NULL,
    project_id UUID NOT NULL REFERENCES master_project(id) ON DELETE RESTRICT,
    issued_to UUID NOT NULL REFERENCES master_employee(id) ON DELETE RESTRICT,
    issued_by UUID NOT NULL REFERENCES master_employee(id) ON DELETE RESTRICT,
    cost_center_id UUID NOT NULL REFERENCES master_cost_center(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ISSUED', 'RETURNED', 'CANCELLED')),
    issued_items_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_mis_number UNIQUE (tenant_id, mis_number)
);

CREATE INDEX IF NOT EXISTS idx_mis_project ON material_issue_slips (project_id);
CREATE INDEX IF NOT EXISTS idx_mis_issued_to ON material_issue_slips (issued_to);
CREATE INDEX IF NOT EXISTS idx_mis_tenant_status ON material_issue_slips (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mis_items_gin ON material_issue_slips USING GIN (issued_items_json);

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES master_project(id) ON DELETE RESTRICT,
    sku_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit_of_measure VARCHAR(50) NOT NULL,
    current_quantity NUMERIC(15, 3) NOT NULL CHECK (current_quantity >= 0),
    reorder_level NUMERIC(15, 3) NOT NULL CHECK (reorder_level >= 0),
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED')),
    batch_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_inventory_sku UNIQUE (tenant_id, project_id, sku_code)
);

CREATE INDEX IF NOT EXISTS idx_inventory_project ON inventory_items (project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_status ON inventory_items (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_batch_gin ON inventory_items USING GIN (batch_details);
