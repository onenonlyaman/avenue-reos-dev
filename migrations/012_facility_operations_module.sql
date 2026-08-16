-- 012_facility_operations_module.sql
-- Production schema for Property Operations, Facility Management, CAM Ledger, and Possession Handover

CREATE TABLE IF NOT EXISTS unit_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  handover_reference VARCHAR(100) NOT NULL,
  unit_name VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  desnagging_completion_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  financial_noc_cleared BOOLEAN NOT NULL DEFAULT false,
  outstanding_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  target_handover_date DATE NOT NULL,
  requires_hitl BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure rejection_reason column exists if table was created previously
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unit_handovers' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE unit_handovers ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_handover_ref ON unit_handovers (tenant_id, handover_reference);
CREATE INDEX IF NOT EXISTS idx_handovers_tenant_status ON unit_handovers (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_handovers_tenant_hitl ON unit_handovers (tenant_id, requires_hitl);
CREATE INDEX IF NOT EXISTS idx_handovers_tenant_created ON unit_handovers (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cam_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_reference VARCHAR(100) NOT NULL,
  unit_name VARCHAR(255) NOT NULL,
  super_builtup_sqft DECIMAL(15,2) NOT NULL,
  billing_period VARCHAR(50) NOT NULL,
  base_cam_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_due_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cam_invoice_ref ON cam_invoices (tenant_id, invoice_reference);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cam_unit_period ON cam_invoices (tenant_id, unit_name, billing_period);
CREATE INDEX IF NOT EXISTS idx_cam_tenant_status ON cam_invoices (tenant_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_cam_tenant_period ON cam_invoices (tenant_id, billing_period);
CREATE INDEX IF NOT EXISTS idx_cam_tenant_created ON cam_invoices (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS facility_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  asset_description VARCHAR(255) NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amc_provider_name VARCHAR(255),
  warranty_expiry_date DATE,
  last_service_date DATE,
  operating_status VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL',
  maintenance_cost NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_tenant_status ON facility_assets (tenant_id, operating_status);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_category ON facility_assets (tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_created ON facility_assets (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  ticket_reference VARCHAR(100) NOT NULL,
  ticket_summary VARCHAR(500) NOT NULL,
  property_location VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'Moderate',
  sla_status VARCHAR(50) NOT NULL DEFAULT 'Within SLA',
  assigned_contractor VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_reference ON maintenance_tickets (tenant_id, ticket_reference);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON maintenance_tickets (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_priority ON maintenance_tickets (tenant_id, priority);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_sla ON maintenance_tickets (tenant_id, sla_status);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_created ON maintenance_tickets (tenant_id, created_at DESC);
