-- 013_procurement_registers_schema.sql
-- Hardening runtime registers for Procurement & Warehouse Management

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_reference VARCHAR(100) NOT NULL,
  site_name VARCHAR(255) NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  material_description VARCHAR(255) NOT NULL,
  quantity DECIMAL(15,2) NOT NULL,
  unit_rate DECIMAL(15,2) NOT NULL,
  freight_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  order_value_amount DECIMAL(15,2) NOT NULL,
  delivery_due_date DATE NOT NULL,
  requires_hitl BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_po_tenant_status ON purchase_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_po_tenant_vendor ON purchase_orders (tenant_id, vendor_name);

CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  grn_reference VARCHAR(100) NOT NULL,
  order_reference VARCHAR(100) NOT NULL,
  warehouse_name VARCHAR(255) NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  material_name VARCHAR(255) NOT NULL,
  accepted_quantity DECIMAL(15,2) NOT NULL,
  rejected_quantity DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'Units',
  inspection_status VARCHAR(50) NOT NULL,
  gatepass_number VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grn_tenant_order ON goods_receipt_notes (tenant_id, order_reference);
CREATE INDEX IF NOT EXISTS idx_grn_tenant_warehouse ON goods_receipt_notes (tenant_id, warehouse_name);

CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  category VARCHAR(100) NOT NULL,
  item_description VARCHAR(255) NOT NULL,
  storage_location VARCHAR(255) NOT NULL,
  available_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'Units',
  reorder_level NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_cat ON warehouse_inventory (tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_item ON warehouse_inventory (tenant_id, item_description);
