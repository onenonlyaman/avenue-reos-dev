-- ============================================================================
-- Avenue Builders REOS - Nashik Demonstration Dataset
-- ============================================================================
-- Populates every dashboard metric, chart and module register with coherent
-- Nashik real estate operating data for a client walkthrough.
--
-- WARNING: Section 1 CLEARS all existing tenant-scoped operating data before
-- inserting the demonstration set. Comment out Section 1 to append instead.
-- Organisation profile, security policy and login accounts are NOT deleted.
--
-- Usage:  psql -d avenue_reos -f migrations/seed_demo_nashik.sql
-- ============================================================================

BEGIN;

-- ============================================================================
DO $$
DECLARE
    tbl text;
    i int;
BEGIN
    FOR i IN 1..3 LOOP
        FOR tbl IN
            SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        LOOP
            BEGIN
                EXECUTE format('DELETE FROM %I WHERE tenant_id = %L::uuid', tbl, '00000000-0000-0000-0000-000000000001');
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END LOOP;
    END LOOP;
END $$;

ALTER TABLE sales_bookings DROP CONSTRAINT IF EXISTS sales_bookings_status_check;
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;
ALTER TABLE construction_wbs_milestones DROP CONSTRAINT IF EXISTS construction_wbs_milestones_status_check;
ALTER TABLE contractor_ra_bills DROP CONSTRAINT IF EXISTS contractor_ra_bills_status_check;
ALTER TABLE budget_heads DROP CONSTRAINT IF EXISTS budget_heads_status_check;
ALTER TABLE daily_progress_reports DROP CONSTRAINT IF EXISTS daily_progress_reports_status_check;
ALTER TABLE quality_ncr_reports DROP CONSTRAINT IF EXISTS quality_ncr_reports_status_check;
ALTER TABLE quality_ncr_reports DROP CONSTRAINT IF EXISTS quality_ncr_reports_defect_severity_check;

-- Ensure auxiliary tables exist before seeding
CREATE TABLE IF NOT EXISTS tenant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_legal_name VARCHAR(255),
  gstin_registration VARCHAR(100),
  registered_address TEXT,
  operational_timezone VARCHAR(100),
  base_currency VARCHAR(20),
  fiscal_year_cycle VARCHAR(50),
  active_users_count INT DEFAULT 0,
  active_site_accounts_count INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  mfa_enforced BOOLEAN DEFAULT true,
  whitelisted_ip_ranges TEXT[],
  session_timeout_minutes INT DEFAULT 30,
  password_rotation_days INT DEFAULT 90,
  super_admin_elevation_hitl BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  full_name VARCHAR(255),
  designation VARCHAR(100),
  department VARCHAR(100),
  site_location VARCHAR(255),
  workforce_type VARCHAR(50),
  status VARCHAR(50),
  joining_date VARCHAR(50),
  corporate_email VARCHAR(255),
  contact_number VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  full_name VARCHAR(255),
  corporate_email VARCHAR(255),
  assigned_role VARCHAR(100),
  department VARCHAR(100),
  account_status VARCHAR(50),
  last_active_date VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS system_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  role_name VARCHAR(100) UNIQUE,
  can_read BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT true,
  can_update BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT false,
  can_authorize_hitl BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS system_user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  device_name VARCHAR(255),
  ip_address VARCHAR(100),
  is_current_device BOOLEAN DEFAULT false,
  status VARCHAR(50),
  last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  voucher_reference VARCHAR(100),
  payee_name VARCHAR(255),
  category VARCHAR(100),
  amount NUMERIC(15, 2),
  description TEXT,
  requires_hitl BOOLEAN DEFAULT false,
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS goods_receipt_notes CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS warehouse_inventory CASCADE;

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_reference VARCHAR(100),
  site_name VARCHAR(255),
  vendor_name VARCHAR(255),
  material_description TEXT,
  quantity NUMERIC(15, 2),
  unit_rate NUMERIC(15, 2),
  freight_amount NUMERIC(15, 2),
  gst_amount NUMERIC(15, 2),
  order_value_amount NUMERIC(15, 2),
  delivery_due_date DATE,
  requires_hitl BOOLEAN DEFAULT false,
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE goods_receipt_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  grn_reference VARCHAR(100),
  order_reference VARCHAR(100),
  warehouse_name VARCHAR(255),
  vendor_name VARCHAR(255),
  material_name VARCHAR(255),
  accepted_quantity NUMERIC(15, 2),
  rejected_quantity NUMERIC(15, 2),
  unit_of_measure VARCHAR(50),
  inspection_status VARCHAR(50),
  gatepass_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warehouse_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  category VARCHAR(100),
  item_description VARCHAR(255),
  storage_location VARCHAR(255),
  available_quantity NUMERIC(15, 2),
  unit_of_measure VARCHAR(50),
  reorder_level NUMERIC(15, 2),
  unit_cost NUMERIC(15, 2)
);

DROP TABLE IF EXISTS land_parcels CASCADE;
CREATE TABLE land_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  parcel_reference VARCHAR(100),
  parcel_description TEXT,
  location_zone VARCHAR(255),
  plot_area_acres NUMERIC(15, 2),
  applicable_fsi NUMERIC(5, 2),
  base_land_value_amount NUMERIC(15, 2),
  stamp_duty_amount NUMERIC(15, 2),
  registration_amount NUMERIC(15, 2),
  total_outlay_amount NUMERIC(15, 2),
  title_status VARCHAR(100),
  acquisition_phase VARCHAR(100),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS jda_contracts CASCADE;
CREATE TABLE jda_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agreement_reference VARCHAR(100),
  landowner_name VARCHAR(255),
  project_site VARCHAR(255),
  developer_share_pct NUMERIC(5, 2),
  landowner_share_pct NUMERIC(5, 2),
  escrow_account_status VARCHAR(100),
  contract_status VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS rera_compliances CASCADE;
CREATE TABLE rera_compliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_name VARCHAR(255),
  rera_reg_reference VARCHAR(100),
  quarterly_return_status VARCHAR(100),
  escrow_balance_amount NUMERIC(15, 2),
  form1_status BOOLEAN DEFAULT false,
  form2_status BOOLEAN DEFAULT false,
  form3_status BOOLEAN DEFAULT false,
  certificate_audit_status VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS title_search_logs CASCADE;
CREATE TABLE title_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  survey_number VARCHAR(100),
  legal_advocate VARCHAR(255),
  search_period_years INT,
  encumbrance_status VARCHAR(100),
  extract_verified_712 BOOLEAN DEFAULT false,
  risk_rating VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS facility_assets CASCADE;
CREATE TABLE facility_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  asset_description TEXT,
  location_name VARCHAR(255),
  category VARCHAR(100),
  amc_provider_name VARCHAR(255),
  warranty_expiry_date DATE,
  last_service_date DATE,
  operating_status VARCHAR(50),
  maintenance_cost NUMERIC(15, 2)
);

DROP TABLE IF EXISTS maintenance_tickets CASCADE;
CREATE TABLE maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  ticket_reference VARCHAR(100),
  ticket_summary TEXT,
  property_location VARCHAR(255),
  category VARCHAR(100),
  priority VARCHAR(50),
  sla_status VARCHAR(100),
  assigned_contractor VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS unit_handovers CASCADE;
CREATE TABLE unit_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  handover_reference VARCHAR(100),
  unit_name VARCHAR(255),
  buyer_name VARCHAR(255),
  desnagging_completion_pct NUMERIC(5, 2),
  financial_noc_cleared BOOLEAN DEFAULT false,
  outstanding_balance NUMERIC(15, 2),
  target_handover_date DATE,
  requires_hitl BOOLEAN DEFAULT false,
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS cam_invoices CASCADE;
CREATE TABLE cam_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_reference VARCHAR(100),
  unit_name VARCHAR(255),
  super_builtup_sqft NUMERIC(15, 2),
  billing_period VARCHAR(50),
  base_cam_amount NUMERIC(15, 2),
  gst_amount NUMERIC(15, 2),
  total_due_amount NUMERIC(15, 2),
  payment_status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS hr_attendance_logs CASCADE;
CREATE TABLE hr_attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_name VARCHAR(255),
  site_location VARCHAR(255),
  check_in_time VARCHAR(20),
  check_out_time VARCHAR(20),
  device_status VARCHAR(50),
  overtime_hours NUMERIC(5, 2),
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS hr_payroll_runs CASCADE;
CREATE TABLE hr_payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  cycle_month VARCHAR(50),
  total_gross_salary NUMERIC(15, 2),
  total_pf_deduction NUMERIC(15, 2),
  total_esic_deduction NUMERIC(15, 2),
  total_pt_deduction NUMERIC(15, 2),
  approved_expenses NUMERIC(15, 2),
  net_payable NUMERIC(15, 2),
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  employee_count INT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS hr_candidates CASCADE;
CREATE TABLE hr_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  candidate_name VARCHAR(255),
  target_position VARCHAR(255),
  experience_level VARCHAR(100),
  current_stage VARCHAR(100),
  interview_score INT,
  contact_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS hr_performance_goals CASCADE;
CREATE TABLE hr_performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_name VARCHAR(255),
  is_trainee BOOLEAN DEFAULT false,
  department VARCHAR(100),
  title VARCHAR(255),
  target_score INT,
  achieved_score INT,
  status VARCHAR(50)
);

DROP TABLE IF EXISTS hr_approvals CASCADE;
CREATE TABLE hr_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  approval_reference VARCHAR(100),
  employee_name VARCHAR(255),
  approval_type VARCHAR(100),
  type VARCHAR(100),
  reference_name VARCHAR(255),
  amount NUMERIC(15, 2),
  justification TEXT,
  requested_by VARCHAR(255),
  details TEXT,
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS support_tickets CASCADE;
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  ticket_code VARCHAR(100),
  ticket_reference VARCHAR(100),
  customer_name VARCHAR(255),
  subject VARCHAR(255),
  category VARCHAR(100),
  assigned_department VARCHAR(100),
  priority VARCHAR(50),
  sla_status VARCHAR(100),
  status VARCHAR(50),
  claim_amount NUMERIC(15, 2) DEFAULT 0,
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS master_catalog_options CASCADE;
CREATE TABLE master_catalog_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  category VARCHAR(100),
  option_value VARCHAR(255),
  sort_order INT,
  CONSTRAINT uq_catalog_option UNIQUE (tenant_id, category, option_value)
);

DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_channels CASCADE;
DROP TABLE IF EXISTS customer_timelines CASCADE;
DROP TABLE IF EXISTS communications_approvals CASCADE;
DROP TABLE IF EXISTS communications_integrations CASCADE;

CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  channel_name VARCHAR(100),
  department VARCHAR(100),
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  member_count INT DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_name VARCHAR(255),
  sender_role VARCHAR(100),
  content TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_name VARCHAR(255),
  unit_number VARCHAR(50),
  interaction_type VARCHAR(100),
  summary TEXT,
  officer_name VARCHAR(255),
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  event_title VARCHAR(255),
  event_category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE communications_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  ticket_reference VARCHAR(100),
  customer_name VARCHAR(255),
  issue_summary TEXT,
  campaign_name VARCHAR(255),
  target_audience VARCHAR(100),
  channel VARCHAR(50),
  recipient_count INT,
  estimated_cost NUMERIC(15, 2),
  claim_amount NUMERIC(15, 2),
  justification TEXT,
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE communications_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider_name VARCHAR(100),
  service_name VARCHAR(100),
  integration_type VARCHAR(50),
  channel_type VARCHAR(100),
  status VARCHAR(50),
  dispatched_24h INT DEFAULT 0,
  last_webhook_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  message_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS integration_connectors CASCADE;
DROP TABLE IF EXISTS integration_logs CASCADE;
DROP TABLE IF EXISTS integration_approvals CASCADE;
DROP TABLE IF EXISTS hardware_workspace_integrations CASCADE;

CREATE TABLE integration_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  connector_name VARCHAR(100) UNIQUE,
  system_type VARCHAR(100),
  category VARCHAR(100),
  sync_frequency VARCHAR(50),
  health_status VARCHAR(50),
  status VARCHAR(50),
  last_sync_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  synced_vouchers_24h INT DEFAULT 0,
  unreconciled_webhooks INT DEFAULT 0,
  last_sync TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  connector_name VARCHAR(100),
  provider_name VARCHAR(100),
  endpoint VARCHAR(255),
  payload_type VARCHAR(100),
  response_status VARCHAR(50),
  action VARCHAR(100),
  status VARCHAR(50),
  latency_ms INT DEFAULT 0,
  records_processed INT DEFAULT 0,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE integration_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  connector_name VARCHAR(100),
  integration_name VARCHAR(100),
  action_type VARCHAR(100),
  sync_amount NUMERIC(15, 2),
  requested_by VARCHAR(255),
  justification TEXT,
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hardware_workspace_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  integration_name VARCHAR(100),
  device_name VARCHAR(255),
  device_type VARCHAR(100),
  category VARCHAR(100),
  location VARCHAR(255),
  status VARCHAR(50),
  synced_documents_or_logs INT DEFAULT 0,
  last_sync_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS mcp_registered_tools CASCADE;
DROP TABLE IF EXISTS mcp_agent_sessions CASCADE;
DROP TABLE IF EXISTS mcp_execution_logs CASCADE;
DROP TABLE IF EXISTS mcp_approvals CASCADE;

CREATE TABLE mcp_registered_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  tool_name VARCHAR(100) UNIQUE,
  server_name VARCHAR(100),
  target_module VARCHAR(100),
  description TEXT,
  is_mutative BOOLEAN DEFAULT false,
  requires_hitl BOOLEAN DEFAULT false,
  execution_count INT DEFAULT 0,
  schema_input TEXT,
  status VARCHAR(50)
);

CREATE TABLE mcp_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  session_reference VARCHAR(100),
  agent_title VARCHAR(100),
  agent_role VARCHAR(100),
  assigned_scope VARCHAR(100),
  origin_ip VARCHAR(50),
  permission_level VARCHAR(50),
  last_ping TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  session_status VARCHAR(50),
  status VARCHAR(50),
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mcp_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_title VARCHAR(100),
  tool_name VARCHAR(100),
  invoked_tool VARCHAR(100),
  parameters_summary TEXT,
  execution_status VARCHAR(50),
  status VARCHAR(50),
  latency_ms INT DEFAULT 0,
  duration_ms INT DEFAULT 0,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mcp_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_title VARCHAR(100),
  invoked_tool VARCHAR(100),
  action_name VARCHAR(100),
  agent_id VARCHAR(100),
  target_module VARCHAR(100),
  parameters_summary TEXT,
  justification TEXT,
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS ai_documents_legal CASCADE;
DROP TABLE IF EXISTS ai_construction_safety CASCADE;
DROP TABLE IF EXISTS ai_finance_procurement CASCADE;
DROP TABLE IF EXISTS ai_risk_market CASCADE;
DROP TABLE IF EXISTS ai_intelligence_approvals CASCADE;

CREATE TABLE ai_documents_legal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  document_title VARCHAR(255),
  document_name VARCHAR(255),
  document_type VARCHAR(100),
  target_project_or_buyer VARCHAR(255),
  verification_status VARCHAR(50),
  analysis_summary TEXT,
  summary_text TEXT,
  risk_score INT DEFAULT 0,
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  generation_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_construction_safety (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  site_name VARCHAR(255),
  camera_location VARCHAR(255),
  incident_type VARCHAR(100),
  risk_severity VARCHAR(50),
  safety_score INT DEFAULT 0,
  risk_level VARCHAR(50),
  labor_count INT DEFAULT 0,
  projected_schedule_delay_days INT DEFAULT 0,
  recommendations TEXT,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_finance_procurement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  analysis_title VARCHAR(255),
  item_name VARCHAR(255),
  suggested_vendor_name VARCHAR(255),
  historical_quote_amount NUMERIC(15, 2),
  recommended_allocation_amount NUMERIC(15, 2),
  savings_percentage NUMERIC(5, 2),
  cash_burn_trajectory VARCHAR(50),
  anomaly_count INT DEFAULT 0,
  potential_savings NUMERIC(15, 2),
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_risk_market (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  zone VARCHAR(100),
  commodity_name VARCHAR(255),
  current_market_index_price NUMERIC(15, 2),
  price_trend_recommendation VARCHAR(50),
  fraud_anomaly_score INT DEFAULT 0,
  customer_sentiment_score INT DEFAULT 0,
  signal_amount NUMERIC(15, 2),
  summary TEXT,
  price_trend VARCHAR(50),
  demand_index INT DEFAULT 0,
  risk_level VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_intelligence_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title VARCHAR(255),
  category VARCHAR(100),
  target_reference VARCHAR(100),
  insight_title VARCHAR(255),
  recommended_action TEXT,
  amount NUMERIC(15, 2),
  impact_amount NUMERIC(15, 2),
  justification TEXT,
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS analytics_liquidity CASCADE;
DROP TABLE IF EXISTS enterprise_risks CASCADE;
DROP TABLE IF EXISTS capital_allocation_requests CASCADE;
DROP TABLE IF EXISTS security_override_requests CASCADE;
DROP TABLE IF EXISTS user_role_approvals CASCADE;
DROP TABLE IF EXISTS audit_trail_logs CASCADE;
DROP TABLE IF EXISTS event_stream_logs CASCADE;
DROP TABLE IF EXISTS system_notifications CASCADE;

CREATE TABLE analytics_liquidity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  period VARCHAR(50),
  operating_period VARCHAR(50),
  customer_inflows_lakhs NUMERIC(15, 2),
  vendor_outflows_lakhs NUMERIC(15, 2),
  debt_service_lakhs NUMERIC(15, 2),
  net_operating_cashflow_lakhs NUMERIC(15, 2),
  dscr_ratio NUMERIC(5, 2),
  solvency_status VARCHAR(50),
  cash_inflow NUMERIC(15, 2),
  cash_outflow NUMERIC(15, 2),
  net_liquidity NUMERIC(15, 2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE enterprise_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  risk_title VARCHAR(255),
  risk_category VARCHAR(100),
  associated_project_site VARCHAR(255),
  risk_vector_summary TEXT,
  impact_rating VARCHAR(50),
  mitigation_action_plan TEXT,
  category VARCHAR(100),
  impact VARCHAR(50),
  probability VARCHAR(50),
  risk_level VARCHAR(50),
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE capital_allocation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  request_reference VARCHAR(100),
  project_name VARCHAR(255),
  requested_capital_lakhs NUMERIC(15, 2),
  requested_amount NUMERIC(15, 2),
  allocation_purpose TEXT,
  justification TEXT,
  risk_rating VARCHAR(50),
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE security_override_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  request_reference VARCHAR(100),
  request_title VARCHAR(255),
  requesting_admin_name VARCHAR(255),
  modification_type VARCHAR(100),
  target_user_or_policy VARCHAR(255),
  justification TEXT,
  requested_by VARCHAR(255),
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_role_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  target_user_name VARCHAR(255),
  user_email VARCHAR(255),
  requested_role VARCHAR(100),
  requested_financial_limit NUMERIC(15, 2),
  justification TEXT,
  status VARCHAR(50),
  requires_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_trail_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  officer_name VARCHAR(255),
  user_email VARCHAR(255),
  module_executed VARCHAR(100),
  action_type VARCHAR(100),
  action VARCHAR(255),
  module VARCHAR(100),
  target_description TEXT,
  ip_address VARCHAR(50),
  security_verified BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_stream_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_name VARCHAR(100),
  event_type VARCHAR(100),
  origin_module VARCHAR(100),
  target_module VARCHAR(100),
  payload_summary TEXT,
  payload_json JSONB,
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  src_module VARCHAR(100),
  user_type VARCHAR(100),
  type VARCHAR(100),
  description TEXT,
  action_link VARCHAR(255),
  priority VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE customer_timelines ADD COLUMN IF NOT EXISTS unit_number VARCHAR(50);
ALTER TABLE customer_timelines ADD COLUMN IF NOT EXISTS interaction_type VARCHAR(100);
ALTER TABLE customer_timelines ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE customer_timelines ADD COLUMN IF NOT EXISTS officer_name VARCHAR(255);
ALTER TABLE customer_timelines ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE hr_approvals ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE hr_approvals ADD COLUMN IF NOT EXISTS reference_name VARCHAR(255);
ALTER TABLE hr_approvals ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2);
ALTER TABLE hr_approvals ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE hr_approvals ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);
ALTER TABLE hr_approvals ADD COLUMN IF NOT EXISTS requires_hitl BOOLEAN DEFAULT false;

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_reference VARCHAR(100);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(100);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_department VARCHAR(100);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS claim_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS requires_hitl BOOLEAN DEFAULT false;

ALTER TABLE communications_approvals ADD COLUMN IF NOT EXISTS ticket_reference VARCHAR(100);
ALTER TABLE communications_approvals ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE communications_approvals ADD COLUMN IF NOT EXISTS issue_summary TEXT;
ALTER TABLE communications_approvals ADD COLUMN IF NOT EXISTS claim_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE communications_approvals ADD COLUMN IF NOT EXISTS justification TEXT;

ALTER TABLE communications_integrations ADD COLUMN IF NOT EXISTS service_name VARCHAR(100);
ALTER TABLE communications_integrations ADD COLUMN IF NOT EXISTS channel_type VARCHAR(100);
ALTER TABLE communications_integrations ADD COLUMN IF NOT EXISTS dispatched_24h INT DEFAULT 0;
ALTER TABLE communications_integrations ADD COLUMN IF NOT EXISTS last_webhook_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE integration_connectors ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE integration_connectors ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE integration_connectors ADD COLUMN IF NOT EXISTS synced_vouchers_24h INT DEFAULT 0;
ALTER TABLE integration_connectors ADD COLUMN IF NOT EXISTS unreconciled_webhooks INT DEFAULT 0;

ALTER TABLE hardware_workspace_integrations ADD COLUMN IF NOT EXISTS integration_name VARCHAR(100);
ALTER TABLE hardware_workspace_integrations ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE hardware_workspace_integrations ADD COLUMN IF NOT EXISTS synced_documents_or_logs INT DEFAULT 0;
ALTER TABLE hardware_workspace_integrations ADD COLUMN IF NOT EXISTS last_sync_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE integration_logs ADD COLUMN IF NOT EXISTS provider_name VARCHAR(100);
ALTER TABLE integration_logs ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255);
ALTER TABLE integration_logs ADD COLUMN IF NOT EXISTS payload_type VARCHAR(100);
ALTER TABLE integration_logs ADD COLUMN IF NOT EXISTS response_status VARCHAR(50);
ALTER TABLE integration_logs ADD COLUMN IF NOT EXISTS latency_ms INT DEFAULT 0;

ALTER TABLE integration_approvals ADD COLUMN IF NOT EXISTS sync_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE integration_approvals ADD COLUMN IF NOT EXISTS justification TEXT;

ALTER TABLE mcp_registered_tools ADD COLUMN IF NOT EXISTS target_module VARCHAR(100);
ALTER TABLE mcp_registered_tools ADD COLUMN IF NOT EXISTS is_mutative BOOLEAN DEFAULT false;
ALTER TABLE mcp_registered_tools ADD COLUMN IF NOT EXISTS execution_count INT DEFAULT 0;
ALTER TABLE mcp_registered_tools ADD COLUMN IF NOT EXISTS schema_input TEXT;

ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS agent_title VARCHAR(100);
ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS assigned_scope VARCHAR(100);
ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS origin_ip VARCHAR(50);
ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS permission_level VARCHAR(50);
ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS last_ping TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE mcp_agent_sessions ADD COLUMN IF NOT EXISTS session_status VARCHAR(50);

ALTER TABLE mcp_execution_logs ADD COLUMN IF NOT EXISTS agent_title VARCHAR(100);
ALTER TABLE mcp_execution_logs ADD COLUMN IF NOT EXISTS invoked_tool VARCHAR(100);
ALTER TABLE mcp_execution_logs ADD COLUMN IF NOT EXISTS parameters_summary TEXT;
ALTER TABLE mcp_execution_logs ADD COLUMN IF NOT EXISTS latency_ms INT DEFAULT 0;

ALTER TABLE mcp_approvals ADD COLUMN IF NOT EXISTS agent_title VARCHAR(100);
ALTER TABLE mcp_approvals ADD COLUMN IF NOT EXISTS invoked_tool VARCHAR(100);
ALTER TABLE mcp_approvals ADD COLUMN IF NOT EXISTS target_module VARCHAR(100);
ALTER TABLE mcp_approvals ADD COLUMN IF NOT EXISTS parameters_summary TEXT;
ALTER TABLE mcp_approvals ADD COLUMN IF NOT EXISTS justification TEXT;

ALTER TABLE ai_documents_legal ADD COLUMN IF NOT EXISTS document_title VARCHAR(255);
ALTER TABLE ai_documents_legal ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
ALTER TABLE ai_documents_legal ADD COLUMN IF NOT EXISTS target_project_or_buyer VARCHAR(255);
ALTER TABLE ai_documents_legal ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50);
ALTER TABLE ai_documents_legal ADD COLUMN IF NOT EXISTS summary_text TEXT;
ALTER TABLE ai_documents_legal ADD COLUMN IF NOT EXISTS generation_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE ai_construction_safety ADD COLUMN IF NOT EXISTS camera_location VARCHAR(255);
ALTER TABLE ai_construction_safety ADD COLUMN IF NOT EXISTS incident_type VARCHAR(100);
ALTER TABLE ai_construction_safety ADD COLUMN IF NOT EXISTS risk_severity VARCHAR(50);
ALTER TABLE ai_construction_safety ADD COLUMN IF NOT EXISTS labor_count INT DEFAULT 0;
ALTER TABLE ai_construction_safety ADD COLUMN IF NOT EXISTS projected_schedule_delay_days INT DEFAULT 0;
ALTER TABLE ai_construction_safety ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE ai_finance_procurement ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
ALTER TABLE ai_finance_procurement ADD COLUMN IF NOT EXISTS suggested_vendor_name VARCHAR(255);
ALTER TABLE ai_finance_procurement ADD COLUMN IF NOT EXISTS historical_quote_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE ai_finance_procurement ADD COLUMN IF NOT EXISTS recommended_allocation_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE ai_finance_procurement ADD COLUMN IF NOT EXISTS savings_percentage NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE ai_finance_procurement ADD COLUMN IF NOT EXISTS cash_burn_trajectory VARCHAR(50);

ALTER TABLE ai_risk_market ADD COLUMN IF NOT EXISTS commodity_name VARCHAR(255);
ALTER TABLE ai_risk_market ADD COLUMN IF NOT EXISTS current_market_index_price NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE ai_risk_market ADD COLUMN IF NOT EXISTS price_trend_recommendation VARCHAR(50);
ALTER TABLE ai_risk_market ADD COLUMN IF NOT EXISTS fraud_anomaly_score INT DEFAULT 0;
ALTER TABLE ai_risk_market ADD COLUMN IF NOT EXISTS customer_sentiment_score INT DEFAULT 0;
ALTER TABLE ai_risk_market ADD COLUMN IF NOT EXISTS signal_amount NUMERIC(15, 2) DEFAULT 0;

ALTER TABLE ai_intelligence_approvals ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE ai_intelligence_approvals ADD COLUMN IF NOT EXISTS target_reference VARCHAR(100);
ALTER TABLE ai_intelligence_approvals ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE ai_intelligence_approvals ADD COLUMN IF NOT EXISTS justification TEXT;

ALTER TABLE analytics_liquidity ADD COLUMN IF NOT EXISTS operating_period VARCHAR(50);
ALTER TABLE analytics_liquidity ADD COLUMN IF NOT EXISTS customer_inflows_lakhs NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE analytics_liquidity ADD COLUMN IF NOT EXISTS vendor_outflows_lakhs NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE analytics_liquidity ADD COLUMN IF NOT EXISTS debt_service_lakhs NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE analytics_liquidity ADD COLUMN IF NOT EXISTS net_operating_cashflow_lakhs NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE analytics_liquidity ADD COLUMN IF NOT EXISTS dscr_ratio NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE analytics_liquidity ADD COLUMN IF NOT EXISTS solvency_status VARCHAR(50);

ALTER TABLE enterprise_risks ADD COLUMN IF NOT EXISTS risk_category VARCHAR(100);
ALTER TABLE enterprise_risks ADD COLUMN IF NOT EXISTS associated_project_site VARCHAR(255);
ALTER TABLE enterprise_risks ADD COLUMN IF NOT EXISTS risk_vector_summary TEXT;
ALTER TABLE enterprise_risks ADD COLUMN IF NOT EXISTS impact_rating VARCHAR(50);
ALTER TABLE enterprise_risks ADD COLUMN IF NOT EXISTS mitigation_action_plan TEXT;

ALTER TABLE capital_allocation_requests ADD COLUMN IF NOT EXISTS request_reference VARCHAR(100);
ALTER TABLE capital_allocation_requests ADD COLUMN IF NOT EXISTS requested_capital_lakhs NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE capital_allocation_requests ADD COLUMN IF NOT EXISTS allocation_purpose TEXT;

ALTER TABLE security_override_requests ADD COLUMN IF NOT EXISTS request_reference VARCHAR(100);
ALTER TABLE security_override_requests ADD COLUMN IF NOT EXISTS requesting_admin_name VARCHAR(255);
ALTER TABLE security_override_requests ADD COLUMN IF NOT EXISTS modification_type VARCHAR(100);
ALTER TABLE security_override_requests ADD COLUMN IF NOT EXISTS target_user_or_policy VARCHAR(255);

ALTER TABLE user_role_approvals ADD COLUMN IF NOT EXISTS target_user_name VARCHAR(255);
ALTER TABLE user_role_approvals ADD COLUMN IF NOT EXISTS requested_financial_limit NUMERIC(15, 2) DEFAULT 0;

ALTER TABLE audit_trail_logs ADD COLUMN IF NOT EXISTS officer_name VARCHAR(255);
ALTER TABLE audit_trail_logs ADD COLUMN IF NOT EXISTS module_executed VARCHAR(100);
ALTER TABLE audit_trail_logs ADD COLUMN IF NOT EXISTS action_type VARCHAR(100);
ALTER TABLE audit_trail_logs ADD COLUMN IF NOT EXISTS target_description TEXT;
ALTER TABLE audit_trail_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
ALTER TABLE audit_trail_logs ADD COLUMN IF NOT EXISTS security_verified BOOLEAN DEFAULT false;
ALTER TABLE audit_trail_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE event_stream_logs ADD COLUMN IF NOT EXISTS event_name VARCHAR(100);
-- ============================================================================
-- SECTION 2 - ORGANISATION PROFILE
-- ============================================================================

DELETE FROM tenant_profiles WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
INSERT INTO tenant_profiles (
  tenant_id, organization_legal_name, gstin_registration, registered_address,
  operational_timezone, base_currency, fiscal_year_cycle, active_users_count, active_site_accounts_count
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid, 'Avenue Builders Pvt. Ltd.', '27AAACA4521R1ZP',
  'Avenue House, Tidke Colony, Sharanpur Road, Nashik 422002, Maharashtra',
  'Asia/Kolkata', 'INR', 'April - March', 12, 4
);

DELETE FROM security_policies WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
INSERT INTO security_policies (
  tenant_id, mfa_enforced, whitelisted_ip_ranges, session_timeout_minutes,
  password_rotation_days, super_admin_elevation_hitl
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid, true, ARRAY['103.14.220.0/24', '49.36.180.0/24'], 30, 90, true
);

-- ============================================================================
-- SECTION 3 - DEVELOPMENT PROJECTS
-- ============================================================================

INSERT INTO master_project (
  id, tenant_id, project_code, project_name, location, total_area_sqft,
  total_budget, status, start_date, expected_completion_date, created_at
) VALUES
  ('11111111-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001'::uuid, 'PRJ-GNK-01', 'Avenue Skyline',
   'Gangapur Road, Nashik', 412000, 1850000000.00, 'ACTIVE', '2024-06-01', '2027-03-31', NOW() - INTERVAL '20 months'),
  ('11111111-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001'::uuid, 'PRJ-IND-02', 'Avenue Greens',
   'Indira Nagar, Nashik', 236000, 960000000.00, 'ACTIVE', '2024-11-15', '2026-12-31', NOW() - INTERVAL '15 months'),
  ('11111111-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001'::uuid, 'PRJ-PTH-03', 'Avenue Commercia',
   'Pathardi Phata, Nashik', 318000, 1420000000.00, 'ACTIVE', '2025-02-01', '2027-09-30', NOW() - INTERVAL '12 months'),
  ('11111111-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001'::uuid, 'PRJ-MKB-04', 'Avenue Riverfront',
   'Makhmalabad, Nashik', 184000, 780000000.00, 'ACTIVE', '2025-08-01', '2028-06-30', NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 4 - WORKFORCE
-- ============================================================================

INSERT INTO master_employee (
  id, tenant_id, employee_code, full_name, email, phone, department, role, designation, status, joining_date
) VALUES
  ('22222222-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-101', 'Aman Bele', 'aman.bele@avenuebuilders.in', '+91 98220 41001', 'Executive Administration', 'Governance Director', 'Managing Director', 'ACTIVE', '2018-04-02'),
  ('22222222-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-102', 'Sneha Kulkarni', 'sneha.kulkarni@avenuebuilders.in', '+91 98220 41002', 'Sales & Customer Relations', 'Sales Manager', 'Head of Sales', 'ACTIVE', '2019-07-15'),
  ('22222222-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-103', 'Prashant Deshmukh', 'prashant.deshmukh@avenuebuilders.in', '+91 98220 41003', 'Finance & Accounts', 'Finance Manager', 'Chief Financial Officer', 'ACTIVE', '2019-01-20'),
  ('22222222-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-104', 'Rohit Wagh', 'rohit.wagh@avenuebuilders.in', '+91 98220 41004', 'Site Construction Operations', 'Site Engineer', 'Senior Site Engineer', 'ACTIVE', '2020-03-10'),
  ('22222222-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-105', 'Manasi Pawar', 'manasi.pawar@avenuebuilders.in', '+91 98220 41005', 'Project Engineering & Quality', 'Site Engineer', 'Quality Engineer', 'ACTIVE', '2021-05-05'),
  ('22222222-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-106', 'Nikhil Sonawane', 'nikhil.sonawane@avenuebuilders.in', '+91 98220 41006', 'Procurement & Logistics', 'Procurement Lead', 'Procurement Manager', 'ACTIVE', '2020-09-01'),
  ('22222222-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-107', 'Pooja Jadhav', 'pooja.jadhav@avenuebuilders.in', '+91 98220 41007', 'Sales & Customer Relations', 'Sales Manager', 'Senior Sales Executive', 'ACTIVE', '2021-11-11'),
  ('22222222-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-108', 'Sagar Bhosale', 'sagar.bhosale@avenuebuilders.in', '+91 98220 41008', 'Site Construction Operations', 'Site Engineer', 'Project Engineer', 'ACTIVE', '2022-02-14'),
  ('22222222-0000-4000-8000-000000000009', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-109', 'Aarti Shinde', 'aarti.shinde@avenuebuilders.in', '+91 98220 41009', 'Legal & Land Acquisition', 'Legal Counsel', 'Legal Manager', 'ACTIVE', '2020-06-22'),
  ('22222222-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-110', 'Kiran Gaikwad', 'kiran.gaikwad@avenuebuilders.in', '+91 98220 41010', 'Executive Administration', 'HR Specialist', 'HR Manager', 'ACTIVE', '2021-08-30'),
  ('22222222-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-111', 'Vaibhav Ahire', 'vaibhav.ahire@avenuebuilders.in', '+91 98220 41011', 'Property & Facility', 'Site Engineer', 'Facility Manager', 'ACTIVE', '2022-07-04'),
  ('22222222-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000001'::uuid, 'EMP-112', 'Shruti Bagul', 'shruti.bagul@avenuebuilders.in', '+91 98220 41012', 'Sales & Customer Relations', 'Sales Manager', 'CRM Executive', 'ACTIVE', '2023-01-09')
ON CONFLICT (id) DO NOTHING;

INSERT INTO hr_employees (
  tenant_id, full_name, designation, department, site_location, workforce_type,
  status, joining_date, corporate_email, contact_number
)
SELECT tenant_id, full_name, designation, department,
  CASE (row_number() OVER (ORDER BY employee_code)) % 4
    WHEN 0 THEN 'Gangapur Road Site'
    WHEN 1 THEN 'Nashik Corporate Headquarters'
    WHEN 2 THEN 'Indira Nagar Site'
    ELSE 'Pathardi Phata Site'
  END,
  CASE WHEN designation LIKE '%Engineer%' THEN 'Contract' ELSE 'Permanent' END,
  'ACTIVE', joining_date::text, email, phone
FROM master_employee WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;

INSERT INTO user_accounts (tenant_id, full_name, corporate_email, assigned_role, department, account_status, last_active_date)
SELECT tenant_id, full_name, email, role, department, 'ACTIVE', to_char(NOW() - (random() * INTERVAL '5 days'), 'YYYY-MM-DD')
FROM master_employee WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;

INSERT INTO system_role_permissions (tenant_id, role_name, can_read, can_create, can_update, can_delete, can_authorize_hitl) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Governance Director', true, true, true, true, true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Project Director', true, true, true, false, true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Finance Manager', true, true, true, false, false),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Procurement Lead', true, true, true, false, false),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Site Engineer', true, true, false, false, false),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Sales Manager', true, true, true, false, false),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Legal Counsel', true, true, true, false, false),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'HR Specialist', true, true, true, false, false)
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO system_user_sessions (tenant_id, device_name, ip_address, is_current_device, status, last_active) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Chrome on Windows - Nashik Corporate Desk', '103.14.220.12', true, 'ACTIVE', NOW()),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Safari on iPad - Gangapur Site Inspection', '103.14.220.45', false, 'ACTIVE', NOW() - INTERVAL '3 hours'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Chrome on Android - Field Sales Handset', '49.36.180.77', false, 'ACTIVE', NOW() - INTERVAL '1 day');

-- ============================================================================
-- SECTION 5 - CUSTOMERS AND VENDORS
-- ============================================================================

INSERT INTO master_customer (id, tenant_id, customer_code, full_name, email, phone_number, tax_identifier, customer_type, status, created_at) VALUES
  ('33333333-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2001', 'Rajesh Kulkarni', 'rajesh.kulkarni@gmail.com', '+91 94220 51001', 'AKLPK4521C', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '11 months'),
  ('33333333-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2002', 'Priya Deshpande', 'priya.deshpande@gmail.com', '+91 94220 51002', 'BLMPD7712F', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '10 months'),
  ('33333333-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2003', 'Sandeep Patil', 'sandeep.patil@outlook.com', '+91 94220 51003', 'CJKPP1123A', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '10 months'),
  ('33333333-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2004', 'Meera Joshi', 'meera.joshi@gmail.com', '+91 94220 51004', 'DKLPJ8890H', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '9 months'),
  ('33333333-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2005', 'Nitin Chavan', 'nitin.chavan@gmail.com', '+91 94220 51005', 'EMNPC3345K', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '9 months'),
  ('33333333-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2006', 'Anjali Sharma', 'anjali.sharma@gmail.com', '+91 94220 51006', 'FPQPS6678L', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '8 months'),
  ('33333333-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2007', 'Sunil Wagh', 'sunil.wagh@gmail.com', '+91 94220 51007', 'GRSPW9901M', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '8 months'),
  ('33333333-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2008', 'Kavita Pawar', 'kavita.pawar@gmail.com', '+91 94220 51008', 'HTUPP2234N', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '7 months'),
  ('33333333-0000-4000-8000-000000000009', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2009', 'Ashok Jadhav', 'ashok.jadhav@gmail.com', '+91 94220 51009', 'IVWPJ5567P', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '7 months'),
  ('33333333-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2010', 'Sarita Bhosale', 'sarita.bhosale@gmail.com', '+91 94220 51010', 'JXYPB8890Q', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '6 months'),
  ('33333333-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2011', 'Mahesh Sonawane', 'mahesh.sonawane@gmail.com', '+91 94220 51011', 'KZAPS1123R', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '6 months'),
  ('33333333-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2012', 'Rupali Shinde', 'rupali.shinde@gmail.com', '+91 94220 51012', 'LBCPS4456S', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '5 months'),
  ('33333333-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2013', 'Ganesh Ahire', 'ganesh.ahire@gmail.com', '+91 94220 51013', 'MDEPA7789T', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '4 months'),
  ('33333333-0000-4000-8000-000000000014', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2014', 'Swati Gaikwad', 'swati.gaikwad@gmail.com', '+91 94220 51014', 'NFGPG1012U', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '4 months'),
  ('33333333-0000-4000-8000-000000000015', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2015', 'Yogesh Bagul', 'yogesh.bagul@gmail.com', '+91 94220 51015', 'OHIPB3345V', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '3 months'),
  ('33333333-0000-4000-8000-000000000016', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2016', 'Nashik Medico Ventures LLP', 'accounts@nashikmedico.in', '+91 94220 51016', '27AAFCN5567W', 'CORPORATE', 'ACTIVE', NOW() - INTERVAL '3 months'),
  ('33333333-0000-4000-8000-000000000017', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2017', 'Godavari Retail Partners', 'finance@godavariretail.in', '+91 94220 51017', '27AAGCG8890X', 'CORPORATE', 'ACTIVE', NOW() - INTERVAL '2 months'),
  ('33333333-0000-4000-8000-000000000018', '00000000-0000-0000-0000-000000000001'::uuid, 'CUST-2018', 'Vinayak Thorat', 'vinayak.thorat@gmail.com', '+91 94220 51018', 'PJKPT6678Y', 'INDIVIDUAL', 'ACTIVE', NOW() - INTERVAL '1 month');

INSERT INTO master_vendor (id, tenant_id, vendor_code, company_name, contact_person, email, phone, vendor_category, tax_number, rating, status) VALUES
  ('44444444-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001'::uuid, 'VEN-301', 'UltraTech Cement - Nashik Depot', 'Sanjay More', 'nashik@ultratechdepot.in', '+91 98901 61001', 'Cement', '27AAACU1234A1Z5', 4.6, 'ACTIVE'),
  ('44444444-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001'::uuid, 'VEN-302', 'Ambika Steel Traders', 'Rakesh Jain', 'sales@ambikasteel.in', '+91 98901 61002', 'Steel & TMT', '27AABCA5567B1Z2', 4.3, 'ACTIVE'),
  ('44444444-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001'::uuid, 'VEN-303', 'Shree Ganesh Infra Contractors', 'Deepak Kale', 'projects@sginfra.in', '+91 98901 61003', 'Civil Contracting', '27AACCS8890C1Z9', 4.1, 'ACTIVE'),
  ('44444444-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001'::uuid, 'VEN-304', 'Godavari Electricals', 'Sunita Rane', 'orders@godavarielectric.in', '+91 98901 61004', 'Electrical', '27AADCG1123D1Z6', 4.4, 'ACTIVE'),
  ('44444444-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000001'::uuid, 'VEN-305', 'Nashik Plumbing Solutions', 'Amit Borse', 'info@nashikplumbing.in', '+91 98901 61005', 'Plumbing', '27AAECN4456E1Z3', 3.9, 'ACTIVE'),
  ('44444444-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000001'::uuid, 'VEN-306', 'Trimbak Tiles & Marble', 'Nilesh Shah', 'sales@trimbaktiles.in', '+91 98901 61006', 'Finishing Material', '27AAFCT7789F1Z0', 4.2, 'ACTIVE'),
  ('44444444-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000001'::uuid, 'VEN-307', 'Panchavati Glass & Facade', 'Harish Patil', 'projects@panchavatiglass.in', '+91 98901 61007', 'Facade & Glazing', '27AAGCP1012G1Z7', 4.0, 'ACTIVE'),
  ('44444444-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000001'::uuid, 'VEN-308', 'Sahyadri Ready Mix Concrete', 'Vikram Patil', 'dispatch@sahyadrirmc.in', '+91 98901 61008', 'Ready Mix Concrete', '27AAHCS3345H1Z4', 4.5, 'ACTIVE'),
  ('44444444-0000-4000-8000-000000000009', '00000000-0000-0000-0000-000000000001'::uuid, 'VEN-309', 'Nandur Lift Installations', 'Prakash Deore', 'service@nandurlifts.in', '+91 98901 61009', 'Elevators', '27AAICN6678I1Z1', 4.2, 'ACTIVE'),
  ('44444444-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000001'::uuid, 'VEN-310', 'Satpur Safety Equipment', 'Manoj Nikam', 'orders@satpursafety.in', '+91 98901 61010', 'Site Safety', '27AAJCS9901J1Z8', 3.8, 'ACTIVE');

-- ============================================================================
-- SECTION 6 - TOWER INVENTORY
-- ============================================================================

INSERT INTO master_unit (
  id, tenant_id, project_id, unit_number, tower_name, floor_number, unit_type,
  carpet_area_sqft, base_price, status, typology, balcony_sqft, floor_rise_charge,
  facing_direction, parking_bays, rera_details, created_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.project_id,
  (p.tower_code || '-' || floor_no::text || lpad(slot::text, 2, '0')),
  p.tower_name,
  floor_no,
  typ.unit_type,
  typ.carpet,
  ROUND(typ.carpet * p.rate + ((floor_no - 1) * 4500))::numeric,
  CASE
    WHEN ((floor_no * 4 + slot) % 10) IN (0, 1, 2, 3) THEN 'BOOKED'
    WHEN ((floor_no * 4 + slot) % 10) IN (4, 5) THEN 'RESERVED'
    WHEN ((floor_no * 4 + slot) % 10) = 6 THEN 'BLOCKED'
    ELSE 'AVAILABLE'
  END,
  typ.unit_type,
  typ.balcony,
  ((floor_no - 1) * 4500)::numeric,
  CASE slot WHEN 1 THEN 'East' WHEN 2 THEN 'West' WHEN 3 THEN 'North' ELSE 'South' END,
  CASE WHEN typ.carpet > 1300 THEN '2 Covered Bays' ELSE '1 Covered Bay' END,
  'Includes statutory structural warranty, fire safety compliance and EV charging provision.',
  NOW() - INTERVAL '14 months'
FROM (
  VALUES
    ('11111111-0000-4000-8000-000000000001'::uuid, 'Skyline Tower A', 'SKA', 14, 6200),
    ('11111111-0000-4000-8000-000000000001'::uuid, 'Skyline Tower B', 'SKB', 12, 6100),
    ('11111111-0000-4000-8000-000000000002'::uuid, 'Greens Wing A', 'GRA', 10, 5400),
    ('11111111-0000-4000-8000-000000000003'::uuid, 'Commercia Block C', 'CMC', 8, 8200),
    ('11111111-0000-4000-8000-000000000004'::uuid, 'Riverfront Wing A', 'RVA', 9, 5800)
) AS p(project_id, tower_name, tower_code, max_floor, rate)
CROSS JOIN LATERAL generate_series(1, p.max_floor) AS floor_no
CROSS JOIN LATERAL generate_series(1, 4) AS slot
CROSS JOIN LATERAL (
  SELECT
    CASE slot
      WHEN 1 THEN '2 BHK Luxury Apartment'
      WHEN 2 THEN '3 BHK Executive Suite'
      WHEN 3 THEN '2 BHK Luxury Apartment'
      ELSE '4 BHK Penthouse Residence'
    END AS unit_type,
    CASE slot WHEN 1 THEN 1080 WHEN 2 THEN 1450 WHEN 3 THEN 1120 ELSE 1980 END AS carpet,
    CASE slot WHEN 1 THEN 85 WHEN 2 THEN 120 WHEN 3 THEN 90 ELSE 180 END AS balcony
) AS typ;

-- ============================================================================
-- SECTION 7 - PROSPECT PIPELINE
-- ============================================================================

INSERT INTO crm_leads (
  id, tenant_id, lead_code, full_name, email, phone, lead_source,
  budget_min, budget_max, status, assigned_rep_id, lead_score, interaction_history_json, created_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  'LEAD-' || lpad(n::text, 4, '0'),
  name_list.full_name,
  lower(replace(name_list.full_name, ' ', '.')) || '@gmail.com',
  '+91 90210 ' || lpad((70000 + n)::text, 5, '0'),
  (ARRAY['Web Form', 'WhatsApp', 'Property Portal', 'Walk-In', 'IVR Call'])[1 + (n % 5)],
  (4500000 + (n % 6) * 500000)::numeric,
  (7500000 + (n % 8) * 750000)::numeric,
  (ARRAY['NEW', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'QUALIFIED', 'QUALIFIED', 'LOST'])[1 + (n % 6)],
  (ARRAY['22222222-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000007', '22222222-0000-4000-8000-000000000012'])[1 + (n % 3)]::uuid,
  55 + (n % 45),
  jsonb_build_object('lastContact', to_char(NOW() - (n || ' days')::interval, 'YYYY-MM-DD'), 'channel', 'Telephonic'),
  NOW() - ((n * 9) || ' days')::interval
FROM generate_series(1, 26) AS n
CROSS JOIN LATERAL (
  SELECT (ARRAY[
    'Amit Pathak', 'Neha Kulkarni', 'Rahul Deshmukh', 'Sneha Jadhav', 'Vikas Shirke',
    'Pallavi Nikam', 'Sagar Kale', 'Trupti Bhoir', 'Nilesh Chaudhari', 'Arti Sable',
    'Rohan Mahajan', 'Deepa Salunke', 'Kunal Borse', 'Madhuri Thakre', 'Sachin Wani',
    'Vaishali Kadam', 'Girish Dhage', 'Snehal More', 'Akash Suryawanshi', 'Rekha Gite',
    'Pravin Zope', 'Manisha Bhamare', 'Tushar Aher', 'Komal Pagar', 'Suresh Landge', 'Jyoti Wagh'
  ])[n] AS full_name
) AS name_list;

-- ============================================================================
-- SECTION 8 - SALES BOOKINGS SPREAD ACROSS TWELVE MONTHS
-- ============================================================================

INSERT INTO sales_bookings (
  id, tenant_id, booking_code, customer_id, unit_id, sales_rep_id,
  agreed_total_price, booking_deposit_amount, discount_percentage, status,
  approved_by, payment_plan_json, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  'SB-' || lpad(seq.rn::text, 4, '0'),
  ('33333333-0000-4000-8000-0000000000' || lpad((1 + (seq.rn % 18))::text, 2, '0'))::uuid,
  seq.unit_id,
  (ARRAY['22222222-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000007', '22222222-0000-4000-8000-000000000012'])[1 + (seq.rn % 3)]::uuid,
  seq.base_price * (1 - (seq.rn % 4) * 0.015),
  ROUND(seq.base_price * 0.10),
  (seq.rn % 4) * 1.5,
  CASE WHEN seq.rn % 9 = 0 THEN 'PENDING_APPROVAL' ELSE 'CONFIRMED' END,
  CASE WHEN seq.rn % 9 = 0 THEN NULL ELSE '22222222-0000-4000-8000-000000000001'::uuid END,
  jsonb_build_object(
    'plan', 'Construction Linked Plan',
    'onBooking', 10, 'onAgreement', 20, 'onSlabCompletion', 50, 'onPossession', 20
  ),
  NOW() - ((seq.rn * 9) || ' days')::interval,
  NOW() - ((seq.rn * 9) || ' days')::interval
FROM (
  SELECT id AS unit_id, base_price, row_number() OVER (ORDER BY created_at, unit_number) AS rn
  FROM master_unit
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid AND status = 'BOOKED'
) AS seq
WHERE seq.rn <= 38;

-- ============================================================================
-- SECTION 9 - FINANCE MASTERS AND LEDGER
-- ============================================================================

INSERT INTO master_chart_of_accounts (id, tenant_id, account_code, account_name, account_type, status) VALUES
  ('55555555-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001'::uuid, '1010', 'HDFC Operating Cash Account', 'ASSET', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001'::uuid, '1020', 'MahaRERA Escrow Account - HDFC', 'ASSET', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001'::uuid, '1030', 'Customer Receivables', 'ASSET', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001'::uuid, '2010', 'Contractor Payables', 'LIABILITY', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000001'::uuid, '2020', 'Statutory Dues Payable', 'LIABILITY', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000001'::uuid, '3010', 'Promoter Equity', 'EQUITY', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000001'::uuid, '4010', 'Residential Sales Income', 'REVENUE', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000001'::uuid, '4020', 'Commercial Sales Income', 'REVENUE', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000009', '00000000-0000-0000-0000-000000000001'::uuid, '5010', 'Civil Construction Expense', 'EXPENSE', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000001'::uuid, '5020', 'Material Procurement Expense', 'EXPENSE', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000001'::uuid, '5030', 'Site Overheads', 'EXPENSE', 'ACTIVE'),
  ('55555555-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000001'::uuid, '5040', 'Marketing & Brokerage', 'EXPENSE', 'ACTIVE');

INSERT INTO master_cost_center (id, tenant_id, cost_center_code, name, project_id, allocated_budget, status) VALUES
  ('66666666-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001'::uuid, 'CC-GNK-01', 'Skyline Substructure & RCC', '11111111-0000-4000-8000-000000000001', 420000000.00, 'ACTIVE'),
  ('66666666-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001'::uuid, 'CC-GNK-02', 'Skyline Facade & Glazing', '11111111-0000-4000-8000-000000000001', 185000000.00, 'ACTIVE'),
  ('66666666-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001'::uuid, 'CC-GNK-03', 'Skyline MEP Services', '11111111-0000-4000-8000-000000000001', 145000000.00, 'ACTIVE'),
  ('66666666-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001'::uuid, 'CC-IND-01', 'Greens Civil Works', '11111111-0000-4000-8000-000000000002', 235000000.00, 'ACTIVE'),
  ('66666666-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000001'::uuid, 'CC-IND-02', 'Greens Interior Finishing', '11111111-0000-4000-8000-000000000002', 128000000.00, 'ACTIVE'),
  ('66666666-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000001'::uuid, 'CC-PTH-01', 'Commercia Structural Frame', '11111111-0000-4000-8000-000000000003', 380000000.00, 'ACTIVE'),
  ('66666666-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000001'::uuid, 'CC-PTH-02', 'Commercia Electrical Grid', '11111111-0000-4000-8000-000000000003', 165000000.00, 'ACTIVE'),
  ('66666666-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000001'::uuid, 'CC-MKB-01', 'Riverfront Site Development', '11111111-0000-4000-8000-000000000004', 142000000.00, 'ACTIVE');

INSERT INTO budget_heads (id, tenant_id, budget_code, cost_center_id, allocated_amount, committed_amount, actual_spent_amount, fiscal_year, status) VALUES
  ('77777777-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001'::uuid, 'BH-GNK-01', '66666666-0000-4000-8000-000000000001', 420000000.00, 268000000.00, 196000000.00, 'FY 2026-27', 'ACTIVE'),
  ('77777777-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001'::uuid, 'BH-GNK-02', '66666666-0000-4000-8000-000000000002', 185000000.00, 92000000.00, 61000000.00, 'FY 2026-27', 'ACTIVE'),
  ('77777777-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001'::uuid, 'BH-GNK-03', '66666666-0000-4000-8000-000000000003', 145000000.00, 118000000.00, 24000000.00, 'FY 2026-27', 'ACTIVE'),
  ('77777777-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001'::uuid, 'BH-IND-01', '66666666-0000-4000-8000-000000000004', 235000000.00, 141000000.00, 88000000.00, 'FY 2026-27', 'ACTIVE'),
  ('77777777-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000001'::uuid, 'BH-IND-02', '66666666-0000-4000-8000-000000000005', 128000000.00, 46000000.00, 21000000.00, 'FY 2026-27', 'ACTIVE'),
  ('77777777-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000001'::uuid, 'BH-PTH-01', '66666666-0000-4000-8000-000000000006', 380000000.00, 214000000.00, 158000000.00, 'FY 2026-27', 'ACTIVE'),
  ('77777777-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000001'::uuid, 'BH-PTH-02', '66666666-0000-4000-8000-000000000007', 165000000.00, 58000000.00, 19000000.00, 'FY 2026-27', 'ACTIVE'),
  ('77777777-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000001'::uuid, 'BH-MKB-01', '66666666-0000-4000-8000-000000000008', 142000000.00, 34000000.00, 11000000.00, 'FY 2026-27', 'ACTIVE');

INSERT INTO general_ledger_entries (
  id, tenant_id, voucher_number, transaction_date, account_id, cost_center_id,
  debit_amount, credit_amount, narration, source_module, created_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  'JV-' || lpad(n::text, 5, '0'),
  (NOW() - ((n * 11) || ' days')::interval)::date,
  ('55555555-0000-4000-8000-0000000000' || lpad((1 + (n % 12))::text, 2, '0'))::uuid,
  ('66666666-0000-4000-8000-0000000000' || lpad((1 + (n % 8))::text, 2, '0'))::uuid,
  CASE WHEN n % 2 = 0 THEN (450000 + (n % 12) * 185000)::numeric ELSE 0 END,
  CASE WHEN n % 2 = 1 THEN (450000 + (n % 12) * 185000)::numeric ELSE 0 END,
  (ARRAY[
    'Contractor running account release - Gangapur Road site',
    'Customer milestone receipt against booking',
    'Cement and steel procurement settlement',
    'MahaRERA escrow transfer - Indira Nagar',
    'Site establishment and labour overheads',
    'Brokerage payout on confirmed bookings'
  ])[1 + (n % 6)],
  (ARRAY['FINANCE', 'CRM', 'PROCUREMENT', 'CONSTRUCTION'])[1 + (n % 4)],
  NOW() - ((n * 11) || ' days')::interval
FROM generate_series(1, 32) AS n;

INSERT INTO finance_vouchers (tenant_id, voucher_reference, payee_name, category, amount, description, requires_hitl, status, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'VCH-' || lpad(n::text, 5, '0'),
  (ARRAY['Shree Ganesh Infra Contractors', 'UltraTech Cement - Nashik Depot', 'Godavari Electricals',
         'Sahyadri Ready Mix Concrete', 'Panchavati Glass & Facade', 'Nashik Municipal Corporation'])[1 + (n % 6)],
  (ARRAY['Contractor Payment', 'Material Disbursement', 'Statutory Payment', 'Operating Expense'])[1 + (n % 4)],
  (320000 + (n % 10) * 240000)::numeric,
  (ARRAY[
    'Running account settlement for structural works',
    'Bulk cement supply against approved purchase order',
    'Statutory development charges payable to civic body',
    'Site electrical fit-out progress payment'
  ])[1 + (n % 4)],
  (320000 + (n % 10) * 240000) > 1000000,
  CASE WHEN n % 5 = 0 THEN 'PENDING_APPROVAL' ELSE 'POSTED' END,
  NOW() - ((n * 6) || ' days')::interval
FROM generate_series(1, 22) AS n;

-- ============================================================================
-- SECTION 10 - PROCUREMENT AND WAREHOUSE
-- ============================================================================

INSERT INTO purchase_orders (
  tenant_id, order_reference, site_name, vendor_name, material_description,
  quantity, unit_rate, freight_amount, gst_amount, order_value_amount,
  delivery_due_date, requires_hitl, status, created_at
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'PO-' || lpad(n::text, 5, '0'),
  (ARRAY['Gangapur Road Site', 'Indira Nagar Site', 'Pathardi Phata Site', 'Makhmalabad Site'])[1 + (n % 4)],
  (ARRAY['UltraTech Cement - Nashik Depot', 'Ambika Steel Traders', 'Sahyadri Ready Mix Concrete',
         'Godavari Electricals', 'Trimbak Tiles & Marble', 'Panchavati Glass & Facade'])[1 + (n % 6)],
  (ARRAY['OPC 53 Grade Cement', 'Fe500D TMT Reinforcement Bars', 'M30 Ready Mix Concrete',
         'LT Panel and Cabling', 'Vitrified Flooring Tiles', 'Structural Glazing Units'])[1 + (n % 6)],
  (400 + (n % 9) * 150)::numeric,
  (390 + (n % 7) * 260)::numeric,
  (18000 + (n % 5) * 6500)::numeric,
  ROUND((400 + (n % 9) * 150) * (390 + (n % 7) * 260) * 0.18)::numeric,
  ROUND((400 + (n % 9) * 150) * (390 + (n % 7) * 260) * 1.18 + (18000 + (n % 5) * 6500))::numeric,
  (NOW() + ((n % 20) || ' days')::interval)::date,
  ROUND((400 + (n % 9) * 150) * (390 + (n % 7) * 260) * 1.18) > 1500000,
  (ARRAY['APPROVED', 'PENDING_APPROVAL', 'APPROVED', 'DELIVERED', 'APPROVED'])[1 + (n % 5)],
  NOW() - ((n * 7) || ' days')::interval
FROM generate_series(1, 18) AS n;

INSERT INTO goods_receipt_notes (
  tenant_id, grn_reference, order_reference, warehouse_name, vendor_name, material_name,
  accepted_quantity, rejected_quantity, unit_of_measure, inspection_status, gatepass_number, created_at
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'GRN-' || lpad(n::text, 5, '0'),
  'PO-' || lpad(n::text, 5, '0'),
  (ARRAY['Gangapur Road Depot', 'Indira Nagar Depot', 'Pathardi Phata Depot'])[1 + (n % 3)],
  (ARRAY['UltraTech Cement - Nashik Depot', 'Ambika Steel Traders', 'Sahyadri Ready Mix Concrete'])[1 + (n % 3)],
  (ARRAY['OPC 53 Grade Cement', 'Fe500D TMT Reinforcement Bars', 'M30 Ready Mix Concrete'])[1 + (n % 3)],
  (380 + (n % 8) * 120)::numeric,
  (n % 4) * 5,
  (ARRAY['Bags', 'Metric Tonnes', 'Cubic Metres'])[1 + (n % 3)],
  (ARRAY['ACCEPTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED'])[1 + (n % 3)],
  'GP-' || lpad((7100 + n)::text, 5, '0'),
  NOW() - ((n * 8) || ' days')::interval
FROM generate_series(1, 12) AS n;

INSERT INTO warehouse_inventory (tenant_id, category, item_description, storage_location, available_quantity, unit_of_measure, reorder_level, unit_cost) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Cement', 'OPC 53 Grade Cement', 'Gangapur Road Depot', 1840, 'Bags', 600, 392),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Cement', 'PPC Blended Cement', 'Indira Nagar Depot', 420, 'Bags', 500, 368),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Steel & TMT', 'Fe500D TMT Bars 12mm', 'Gangapur Road Depot', 68, 'Metric Tonnes', 25, 64500),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Steel & TMT', 'Fe500D TMT Bars 16mm', 'Pathardi Phata Depot', 22, 'Metric Tonnes', 25, 64200),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Ready Mix Concrete', 'M30 Grade Ready Mix', 'Pathardi Phata Depot', 145, 'Cubic Metres', 80, 5850),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Electrical', 'LT Armoured Cable 4 Core', 'Gangapur Road Depot', 1250, 'Metres', 400, 640),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Electrical', 'Modular Switch Assemblies', 'Indira Nagar Depot', 860, 'Units', 300, 385),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Plumbing', 'CPVC Pipes 25mm', 'Indira Nagar Depot', 0, 'Metres', 500, 210),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Finishing Material', 'Vitrified Flooring Tiles 800x800', 'Gangapur Road Depot', 4200, 'Square Feet', 1500, 96),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Finishing Material', 'Italian Marble Slabs', 'Gangapur Road Depot', 380, 'Square Feet', 400, 640),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Facade & Glazing', 'Double Glazed Glass Units', 'Pathardi Phata Depot', 210, 'Square Metres', 150, 3850),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Site Safety', 'Safety Helmets and Harness Sets', 'Makhmalabad Depot', 180, 'Sets', 100, 1250),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Site Safety', 'Scaffolding Couplers', 'Makhmalabad Depot', 940, 'Units', 400, 165),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Waterproofing', 'Bituminous Membrane Rolls', 'Indira Nagar Depot', 75, 'Rolls', 90, 4250);

-- ============================================================================
-- SECTION 11 - CONSTRUCTION EXECUTION
-- ============================================================================

INSERT INTO construction_sites (id, tenant_id, project_id, site_code, site_name, gps_coordinates, status, site_engineer_id) VALUES
  ('88888888-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001'::uuid, '11111111-0000-4000-8000-000000000001', 'SITE-GNK-01', 'Avenue Skyline Site', '20.0110 N, 73.7550 E', 'ACTIVE', '22222222-0000-4000-8000-000000000004'),
  ('88888888-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001'::uuid, '11111111-0000-4000-8000-000000000002', 'SITE-IND-02', 'Avenue Greens Site', '19.9975 N, 73.7898 E', 'ACTIVE', '22222222-0000-4000-8000-000000000008'),
  ('88888888-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001'::uuid, '11111111-0000-4000-8000-000000000003', 'SITE-PTH-03', 'Avenue Commercia Site', '19.9615 N, 73.7712 E', 'ACTIVE', '22222222-0000-4000-8000-000000000005'),
  ('88888888-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001'::uuid, '11111111-0000-4000-8000-000000000004', 'SITE-MKB-04', 'Avenue Riverfront Site', '20.0332 N, 73.7621 E', 'ACTIVE', '22222222-0000-4000-8000-000000000004');

INSERT INTO construction_wbs_milestones (
  id, tenant_id, project_id, milestone_code, execution_phase, milestone_title,
  phase_weightage_pct, physical_completion_pct, target_start_date, target_completion_date,
  actual_completion_date, assigned_contractor, financial_allocation, status, created_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.project_id,
  'WBS-' || p.code || '-' || lpad(ph.idx::text, 2, '0'),
  ph.phase,
  ph.phase || ' - ' || p.label,
  ph.weight,
  ph.completion,
  (NOW() - ((18 - ph.idx * 3) || ' months')::interval)::date,
  (NOW() - ((12 - ph.idx * 3) || ' months')::interval)::date,
  CASE WHEN ph.completion = 100 THEN (NOW() - ((13 - ph.idx * 3) || ' months')::interval)::date ELSE NULL END,
  (ARRAY['Shree Ganesh Infra Contractors', 'Sahyadri Ready Mix Concrete', 'Godavari Electricals', 'Panchavati Glass & Facade'])[1 + (ph.idx % 4)],
  (28000000 + ph.idx * 12500000)::numeric,
  CASE
    WHEN ph.completion = 100 THEN 'COMPLETED'
    WHEN ph.completion >= 45 THEN 'IN_PROGRESS'
    WHEN ph.idx = 4 THEN 'DELAYED'
    ELSE 'PENDING'
  END,
  NOW() - ((14 - ph.idx) || ' months')::interval
FROM (
  VALUES
    ('11111111-0000-4000-8000-000000000001'::uuid, 'GNK', 'Skyline Tower A'),
    ('11111111-0000-4000-8000-000000000002'::uuid, 'IND', 'Greens Wing A'),
    ('11111111-0000-4000-8000-000000000003'::uuid, 'PTH', 'Commercia Block C'),
    ('11111111-0000-4000-8000-000000000004'::uuid, 'MKB', 'Riverfront Wing A')
) AS p(project_id, code, label)
CROSS JOIN (
  VALUES
    (1, 'Excavation & Foundation', 15.00, 100.00),
    (2, 'Structural RCC Frame', 30.00, 78.00),
    (3, 'Masonry & Plaster', 20.00, 45.00),
    (4, 'MEP Rough-In', 15.00, 22.00),
    (5, 'Facade & Glazing', 10.00, 8.00),
    (6, 'Interior Finishing & Handover', 10.00, 0.00)
) AS ph(idx, phase, weight, completion);

INSERT INTO contractor_ra_bills (
  id, tenant_id, project_id, bill_reference, contractor_name, wbs_phase,
  gross_claim_amount, verified_amount, retained_holdback_amount, gst_amount,
  net_payable_amount, claimed_progress_pct, verified_progress_pct, requires_hitl, status, created_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  ('11111111-0000-4000-8000-00000000000' || (1 + (n % 4)))::uuid,
  'RA-' || lpad(n::text, 5, '0'),
  (ARRAY['Shree Ganesh Infra Contractors', 'Sahyadri Ready Mix Concrete', 'Godavari Electricals',
         'Panchavati Glass & Facade', 'Nashik Plumbing Solutions'])[1 + (n % 5)],
  (ARRAY['Structural RCC Frame', 'Masonry & Plaster', 'MEP Rough-In', 'Facade & Glazing', 'Excavation & Foundation'])[1 + (n % 5)],
  gross.amount,
  ROUND(gross.amount * 0.95),
  ROUND(gross.amount * 0.05),
  ROUND(gross.amount * 0.18),
  ROUND(gross.amount * 0.95 * 1.18 - gross.amount * 0.05),
  (55 + (n % 40))::numeric,
  (52 + (n % 38))::numeric,
  gross.amount > 2500000,
  (ARRAY['APPROVED', 'APPROVED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PENDING_APPROVAL'])[1 + (n % 6)],
  NOW() - ((n * 12) || ' days')::interval
FROM generate_series(1, 22) AS n
CROSS JOIN LATERAL (SELECT (1450000 + (n % 9) * 1250000)::numeric AS amount) AS gross;

INSERT INTO daily_progress_reports (
  id, tenant_id, dpr_code, site_id, report_date, submitted_by, labor_count,
  weather_condition, progress_percentage, status, work_details_json, created_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  'DPR-' || lpad(n::text, 5, '0'),
  ('88888888-0000-4000-8000-00000000000' || (1 + (n % 4)))::uuid,
  (NOW() - (n || ' days')::interval)::date,
  (ARRAY['22222222-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000008', '22222222-0000-4000-8000-000000000005'])[1 + (n % 3)]::uuid,
  48 + (n % 52),
  (ARRAY['Clear', 'Cloudy', 'Light Rain', 'Clear'])[1 + (n % 4)],
  (38 + (n % 55))::numeric,
  'SUBMITTED',
  jsonb_build_object(
    'supervisingEngineer', (ARRAY['Rohit Wagh', 'Sagar Bhosale', 'Manasi Pawar'])[1 + (n % 3)],
    'skilledLaborCount', 22 + (n % 20),
    'unskilledLaborCount', 26 + (n % 32),
    'equipmentHours', 14 + (n % 10),
    'cementBags', 120 + (n % 90),
    'steelMt', 4 + (n % 8),
    'concreteM3', 32 + (n % 45),
    'workDetails', (ARRAY[
      'Slab shuttering and reinforcement completed for tower wing',
      'Column casting executed with M30 grade concrete',
      'Blockwork masonry progressed on typical floors',
      'Electrical conduiting laid ahead of plaster works'
    ])[1 + (n % 4)]
  ),
  NOW() - (n || ' days')::interval
FROM generate_series(1, 28) AS n;

INSERT INTO quality_ncr_reports (
  id, tenant_id, ncr_number, site_id, inspector_id, contractor_id,
  defect_severity, status, description, corrective_action, inspection_details_json, created_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  'NCR-' || lpad(n::text, 5, '0'),
  ('88888888-0000-4000-8000-00000000000' || (1 + (n % 4)))::uuid,
  '22222222-0000-4000-8000-000000000005'::uuid,
  ('44444444-0000-4000-8000-00000000000' || (1 + (n % 5)))::uuid,
  (ARRAY['MINOR', 'MAJOR', 'MINOR', 'CRITICAL'])[1 + (n % 4)],
  (ARRAY['RESOLVED', 'OPEN', 'UNDER_REVIEW', 'CLOSED'])[1 + (n % 4)],
  (ARRAY[
    'Concrete cube strength below specification at 28 day test',
    'Scaffolding harness compliance lapse observed during inspection',
    'Honeycombing noted on column face at third floor',
    'Waterproofing membrane overlap short of specified width'
  ])[1 + (n % 4)],
  (ARRAY[
    'Additional core test scheduled and mix design revised',
    'Toolbox talk conducted and harness audit enforced daily',
    'Surface repaired with approved polymer mortar',
    'Membrane relaid to specified overlap and retested'
  ])[1 + (n % 4)],
  jsonb_build_object('inspectionDate', to_char(NOW() - (n * 6 || ' days')::interval, 'YYYY-MM-DD'), 'zone', 'Tower Wing'),
  NOW() - ((n * 6) || ' days')::interval
FROM generate_series(1, 10) AS n;

-- ============================================================================
-- SECTION 12 - LAND AND REGULATORY
-- ============================================================================

INSERT INTO land_parcels (
  tenant_id, parcel_reference, parcel_description, location_zone, plot_area_acres,
  applicable_fsi, base_land_value_amount, stamp_duty_amount, registration_amount,
  total_outlay_amount, title_status, acquisition_phase, requires_hitl, created_at
) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LND-0001', 'Survey No 104/2A Gangapur Road Frontage', 'Gangapur Road', 2.40, 1.50, 96000000, 6720000, 960000, 103680000, 'Clear Title', 'REGISTERED', false, NOW() - INTERVAL '22 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LND-0002', 'Survey No 88/1 Indira Nagar Residential Zone', 'Indira Nagar', 1.85, 1.50, 64750000, 4532500, 647500, 69930000, 'Clear Title', 'REGISTERED', false, NOW() - INTERVAL '18 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LND-0003', 'Survey No 210/3B Pathardi Phata Commercial Belt', 'Pathardi Phata', 3.10, 2.00, 139500000, 9765000, 1395000, 150660000, 'Clear Title', 'DUE_DILIGENCE', true, NOW() - INTERVAL '10 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LND-0004', 'Survey No 45/1 Makhmalabad Riverfront Belt', 'Makhmalabad', 2.75, 1.10, 82500000, 5775000, 825000, 89100000, 'Title Under Verification', 'FEASIBILITY', true, NOW() - INTERVAL '5 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LND-0005', 'Survey No 17/2 Adgaon Bypass Land Reserve', 'Adgaon', 4.20, 1.10, 105000000, 7350000, 1050000, 113400000, 'Litigated / Encumbered', 'FEASIBILITY', true, NOW() - INTERVAL '2 months');

INSERT INTO jda_contracts (tenant_id, agreement_reference, landowner_name, project_site, developer_share_pct, landowner_share_pct, escrow_account_status, contract_status, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'JDA-0001', 'Shri Madhukar Pagar', 'Avenue Skyline - Gangapur Road', 62.00, 38.00, 'ACTIVE', 'EXECUTED', NOW() - INTERVAL '21 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'JDA-0002', 'Smt. Sulochana Deore', 'Avenue Greens - Indira Nagar', 58.00, 42.00, 'ACTIVE', 'EXECUTED', NOW() - INTERVAL '17 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'JDA-0003', 'Nashik Agro Farms LLP', 'Avenue Riverfront - Makhmalabad', 65.00, 35.00, 'PENDING_ACTIVATION', 'UNDER_NEGOTIATION', NOW() - INTERVAL '4 months');

INSERT INTO rera_compliances (tenant_id, project_name, rera_reg_reference, quarterly_return_status, escrow_balance_amount, form1_status, form2_status, form3_status, certificate_audit_status, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Avenue Skyline', 'P51600045821', 'COMPLIANT', 184500000, true, true, true, 'Compliant', NOW() - INTERVAL '20 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Avenue Greens', 'P51600047233', 'COMPLIANT', 96200000, true, true, false, 'Compliant', NOW() - INTERVAL '15 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Avenue Commercia', 'P51600051194', 'PENDING', 142800000, true, false, false, 'Under Review', NOW() - INTERVAL '11 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Avenue Riverfront', 'P51600055470', 'PENDING', 38400000, false, false, false, 'Under Review', NOW() - INTERVAL '5 months');

INSERT INTO title_search_logs (tenant_id, survey_number, legal_advocate, search_period_years, encumbrance_status, extract_verified_712, risk_rating, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, '104/2A', 'Adv. S. R. Deshpande', 30, 'Clear', true, 'LOW', NOW() - INTERVAL '22 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, '88/1', 'Adv. S. R. Deshpande', 30, 'Clear', true, 'LOW', NOW() - INTERVAL '18 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, '210/3B', 'Adv. M. K. Kulkarni', 30, 'Clear', true, 'LOW', NOW() - INTERVAL '10 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, '45/1', 'Adv. M. K. Kulkarni', 30, 'Under Verification', false, 'MEDIUM', NOW() - INTERVAL '5 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, '17/2', 'Adv. P. B. Jagtap', 30, 'Encumbered', false, 'HIGH', NOW() - INTERVAL '2 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, '62/4', 'Adv. P. B. Jagtap', 30, 'Clear', true, 'LOW', NOW() - INTERVAL '1 month');

-- ============================================================================
-- SECTION 13 - PROPERTY AND FACILITY
-- ============================================================================

INSERT INTO facility_assets (tenant_id, asset_description, location_name, category, amc_provider_name, warranty_expiry_date, last_service_date, operating_status, maintenance_cost) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Passenger Elevator Bank - Tower A', 'Avenue Skyline', 'Elevators', 'Nandur Lift Installations', '2028-03-31', CURRENT_DATE - 24, 'OPERATIONAL', 285000),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Passenger Elevator Bank - Tower B', 'Avenue Skyline', 'Elevators', 'Nandur Lift Installations', '2028-03-31', CURRENT_DATE - 24, 'OPERATIONAL', 285000),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Diesel Generator 250 KVA', 'Avenue Skyline', 'Power Backup', 'Godavari Electricals', '2027-11-30', CURRENT_DATE - 45, 'OPERATIONAL', 168000),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Fire Detection and Alarm Panel', 'Avenue Greens', 'Fire Safety', 'Satpur Safety Equipment', '2027-06-30', CURRENT_DATE - 12, 'OPERATIONAL', 96000),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Sewage Treatment Plant 60 KLD', 'Avenue Greens', 'Water Management', 'Nashik Plumbing Solutions', '2029-01-31', CURRENT_DATE - 60, 'UNDER_MAINTENANCE', 224000),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Rainwater Harvesting Network', 'Avenue Greens', 'Water Management', 'Nashik Plumbing Solutions', '2029-01-31', CURRENT_DATE - 90, 'OPERATIONAL', 74000),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'HVAC Chiller Unit - Retail Podium', 'Avenue Commercia', 'HVAC', 'Godavari Electricals', '2028-09-30', CURRENT_DATE - 8, 'OPERATIONAL', 412000),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'CCTV Surveillance Grid 64 Channel', 'Avenue Commercia', 'Security Systems', 'Satpur Safety Equipment', '2027-12-31', CURRENT_DATE - 30, 'OPERATIONAL', 138000),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Solar Rooftop Array 40 KW', 'Avenue Skyline', 'Renewable Energy', 'Godavari Electricals', '2030-04-30', CURRENT_DATE - 15, 'OPERATIONAL', 92000),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Boom Barrier and Access Control', 'Avenue Riverfront', 'Security Systems', 'Satpur Safety Equipment', '2028-02-28', CURRENT_DATE - 5, 'OPERATIONAL', 58000);

INSERT INTO maintenance_tickets (tenant_id, ticket_reference, ticket_summary, property_location, category, priority, sla_status, assigned_contractor, status, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'MT-' || lpad(n::text, 5, '0'),
  (ARRAY[
    'Lift door sensor intermittent on Tower A',
    'Corridor lighting failure on eighth floor',
    'Water seepage reported in basement parking',
    'Fire extinguisher refill due across podium',
    'Common area pump tripping during peak hours',
    'Terrace waterproofing touch-up requested'
  ])[1 + (n % 6)],
  (ARRAY['Avenue Skyline - Tower A', 'Avenue Greens - Wing A', 'Avenue Commercia - Block C', 'Avenue Riverfront - Wing A'])[1 + (n % 4)],
  (ARRAY['Electrical', 'Plumbing', 'Elevators', 'Fire Safety'])[1 + (n % 4)],
  (ARRAY['Moderate', 'High', 'Critical', 'Moderate'])[1 + (n % 4)],
  CASE WHEN n % 5 = 0 THEN 'SLA Breached' ELSE 'Within SLA' END,
  (ARRAY['Nandur Lift Installations', 'Godavari Electricals', 'Nashik Plumbing Solutions', 'Satpur Safety Equipment'])[1 + (n % 4)],
  (ARRAY['OPEN', 'IN_PROGRESS', 'RESOLVED', 'OPEN', 'CLOSED'])[1 + (n % 5)],
  NOW() - ((n * 3) || ' days')::interval
FROM generate_series(1, 14) AS n;

INSERT INTO unit_handovers (
  tenant_id, handover_reference, unit_name, buyer_name, desnagging_completion_pct,
  financial_noc_cleared, outstanding_balance, target_handover_date, requires_hitl, status, created_at
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'HND-' || lpad(n::text, 5, '0'),
  'Skyline Tower A - Unit ' || (300 + n)::text,
  (ARRAY['Rajesh Kulkarni', 'Priya Deshpande', 'Sandeep Patil', 'Meera Joshi', 'Nitin Chavan',
         'Anjali Sharma', 'Sunil Wagh', 'Kavita Pawar'])[1 + (n % 8)],
  (72 + (n % 28))::numeric,
  (n % 3) <> 0,
  CASE WHEN (n % 3) = 0 THEN (245000 + (n % 5) * 120000)::numeric ELSE 0 END,
  (CURRENT_DATE + ((n % 45) || ' days')::interval)::date,
  (n % 3) = 0,
  CASE WHEN (n % 3) = 0 THEN 'PENDING_APPROVAL' ELSE 'SCHEDULED' END,
  NOW() - ((n * 5) || ' days')::interval
FROM generate_series(1, 10) AS n;

INSERT INTO cam_invoices (
  tenant_id, invoice_reference, unit_name, super_builtup_sqft, billing_period,
  base_cam_amount, gst_amount, total_due_amount, payment_status, created_at
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'CAM-' || lpad(n::text, 5, '0'),
  'Skyline Tower A - Unit ' || (300 + (n % 20))::text,
  (1180 + (n % 8) * 240)::numeric,
  to_char(NOW() - ((n % 6) || ' months')::interval, 'Mon YYYY'),
  ROUND((1180 + (n % 8) * 240) * 3.20)::numeric,
  ROUND((1180 + (n % 8) * 240) * 3.20 * 0.18)::numeric,
  ROUND((1180 + (n % 8) * 240) * 3.20 * 1.18)::numeric,
  (ARRAY['PAID', 'PAID', 'PENDING', 'OVERDUE'])[1 + (n % 4)],
  NOW() - ((n * 4) || ' days')::interval
FROM generate_series(1, 24) AS n;

-- ============================================================================
-- SECTION 14 - HUMAN RESOURCES
-- ============================================================================

INSERT INTO hr_attendance_logs (tenant_id, employee_name, site_location, check_in_time, check_out_time, device_status, overtime_hours, status, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  emp.full_name,
  (ARRAY['Gangapur Road Site', 'Indira Nagar Site', 'Pathardi Phata Site', 'Nashik Corporate Headquarters'])[1 + (n % 4)],
  (ARRAY['08:45', '09:02', '08:58', '09:15'])[1 + (n % 4)],
  (ARRAY['18:30', '19:10', '18:05', '20:00'])[1 + (n % 4)],
  'SYNCED',
  (n % 4)::numeric,
  CASE WHEN n % 11 = 0 THEN 'ABSENT' ELSE 'PRESENT' END,
  NOW() - ((n % 14) || ' days')::interval
FROM generate_series(1, 36) AS n
CROSS JOIN LATERAL (
  SELECT full_name FROM master_employee
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  ORDER BY employee_code OFFSET (n % 12) LIMIT 1
) AS emp;

INSERT INTO hr_payroll_runs (tenant_id, cycle_month, total_gross_salary, total_pf_deduction, total_esic_deduction, total_pt_deduction, approved_expenses, net_payable, status, requires_hitl, employee_count, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, to_char(NOW() - INTERVAL '3 months', 'Mon YYYY'), 4820000, 578400, 36150, 24000, 142000, 4325450, 'DISBURSED', false, 12, NOW() - INTERVAL '3 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, to_char(NOW() - INTERVAL '2 months', 'Mon YYYY'), 4910000, 589200, 36825, 24000, 168000, 4427975, 'DISBURSED', false, 12, NOW() - INTERVAL '2 months'),
  ('00000000-0000-0000-0000-000000000001'::uuid, to_char(NOW() - INTERVAL '1 month', 'Mon YYYY'), 5140000, 616800, 38550, 24000, 196000, 4656650, 'PENDING_APPROVAL', true, 12, NOW() - INTERVAL '1 month');

INSERT INTO hr_candidates (tenant_id, candidate_name, target_position, experience_level, current_stage, interview_score, contact_email, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Ketan Bhamre', 'Senior Site Engineer', 'Senior (5-8 yrs)', 'Offer Issued', 86, 'ketan.bhamre@gmail.com', NOW() - INTERVAL '18 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Ashwini Kale', 'Quantity Surveyor', 'Mid Level (3-5 yrs)', 'Technical Interview', 78, 'ashwini.kale@gmail.com', NOW() - INTERVAL '15 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Rupesh Nikam', 'Procurement Executive', 'Junior (1-3 yrs)', 'Screening', 71, 'rupesh.nikam@gmail.com', NOW() - INTERVAL '12 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Sayali Deore', 'CRM Executive', 'Junior (1-3 yrs)', 'Site Assessment', 82, 'sayali.deore@gmail.com', NOW() - INTERVAL '9 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Mahesh Pingle', 'Accounts Manager', 'Senior (5-8 yrs)', 'Applied', 0, 'mahesh.pingle@gmail.com', NOW() - INTERVAL '6 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Pranali Wagh', 'Safety Officer', 'Mid Level (3-5 yrs)', 'Technical Interview', 80, 'pranali.wagh@gmail.com', NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Omkar Shelke', 'Structural Engineer', 'Lead / Executive (8+ yrs)', 'Screening', 74, 'omkar.shelke@gmail.com', NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Vidya Sonar', 'Legal Associate', 'Mid Level (3-5 yrs)', 'Applied', 0, 'vidya.sonar@gmail.com', NOW() - INTERVAL '1 day');

INSERT INTO hr_performance_goals (tenant_id, employee_name, is_trainee, department, title, target_score, achieved_score, status) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Sneha Kulkarni', false, 'Sales & Customer Relations', 'Achieve 40 confirmed bookings for the fiscal year', 100, 84, 'ON_TRACK'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Pooja Jadhav', false, 'Sales & Customer Relations', 'Convert 25 percent of qualified site visits', 100, 72, 'ON_TRACK'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Rohit Wagh', false, 'Site Construction Operations', 'Deliver Skyline RCC frame within schedule', 100, 68, 'AT_RISK'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Manasi Pawar', false, 'Project Engineering & Quality', 'Close all major inspection findings within 14 days', 100, 91, 'ON_TRACK'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Nikhil Sonawane', false, 'Procurement & Logistics', 'Reduce material landed cost by 4 percent', 100, 63, 'AT_RISK'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Prashant Deshmukh', false, 'Finance & Accounts', 'Close monthly books within five working days', 100, 95, 'ON_TRACK'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Aarti Shinde', false, 'Legal & Land Acquisition', 'Complete title clearance for Makhmalabad parcel', 100, 55, 'AT_RISK'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Sagar Bhosale', true, 'Site Construction Operations', 'Complete site supervision certification', 100, 78, 'ON_TRACK'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Shruti Bagul', true, 'Sales & Customer Relations', 'Complete customer relationship training module', 100, 88, 'ON_TRACK'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Vaibhav Ahire', false, 'Property & Facility', 'Maintain facility uptime above 98 percent', 100, 93, 'ON_TRACK');

INSERT INTO hr_approvals (tenant_id, type, reference_name, amount, justification, requested_by, status, requires_hitl, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Payroll Disbursement', to_char(NOW() - INTERVAL '1 month', 'Mon YYYY') || ' Payroll Cycle', 4656650, 'Monthly workforce disbursement exceeds executive authorization limit.', 'Kiran Gaikwad', 'PENDING_APPROVAL', true, NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Exit Settlement', 'Full and final settlement - Site Supervisor', 385000, 'Exit settlement including notice period and gratuity provision.', 'Kiran Gaikwad', 'PENDING_APPROVAL', true, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Recruitment Offer', 'Senior Site Engineer offer release', 1250000, 'Annual compensation above budgeted band for the role.', 'Kiran Gaikwad', 'APPROVED', true, NOW() - INTERVAL '12 days');

-- ============================================================================
-- SECTION 15 - COMMUNICATIONS
-- ============================================================================

INSERT INTO chat_channels (tenant_id, channel_name, department, description, is_private, member_count, last_activity) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'skyline-site-operations', 'Site Operations', 'Daily coordination for the Gangapur Road development.', false, 14, NOW() - INTERVAL '25 minutes'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'greens-site-operations', 'Site Operations', 'Execution updates for the Indira Nagar development.', false, 11, NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'sales-desk', 'Sales & CRM', 'Prospect handovers, site visit scheduling and booking updates.', false, 9, NOW() - INTERVAL '40 minutes'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'finance-controls', 'Finance & Accounting', 'Disbursement clearances and budget escalations.', true, 6, NOW() - INTERVAL '5 hours'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'procurement-desk', 'Procurement & Materials', 'Vendor quotations, purchase orders and delivery tracking.', false, 8, NOW() - INTERVAL '3 hours'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'legal-compliance', 'Legal & Regulatory', 'MahaRERA filings, title clearances and agreement tracking.', true, 5, NOW() - INTERVAL '1 day');

INSERT INTO chat_messages (tenant_id, channel_id, sender_name, sender_role, content, is_pinned, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  ch.id,
  (ARRAY['Rohit Wagh', 'Sneha Kulkarni', 'Prashant Deshmukh', 'Nikhil Sonawane', 'Aarti Shinde'])[1 + (n % 5)],
  (ARRAY['Senior Site Engineer', 'Head of Sales', 'Chief Financial Officer', 'Procurement Manager', 'Legal Manager'])[1 + (n % 5)],
  (ARRAY[
    'Slab casting for the eighth floor completed ahead of schedule today.',
    'Two site visits confirmed for the weekend at Gangapur Road.',
    'Contractor running account release cleared for structural works.',
    'Cement consignment dispatched from the Nashik depot this morning.',
    'MahaRERA quarterly return filed for the Skyline registration.',
    'Please review the revised facade quotation before Friday.'
  ])[1 + (n % 6)],
  n % 9 = 0,
  NOW() - ((n * 3) || ' hours')::interval
FROM generate_series(1, 24) AS n
CROSS JOIN LATERAL (
  SELECT id FROM chat_channels WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid ORDER BY channel_name OFFSET (n % 6) LIMIT 1
) AS ch;

INSERT INTO support_tickets (tenant_id, ticket_reference, customer_name, subject, category, assigned_department, priority, sla_status, status, claim_amount, requires_hitl, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'TKT-' || lpad(n::text, 5, '0'),
  (ARRAY['Rajesh Kulkarni', 'Priya Deshpande', 'Sandeep Patil', 'Meera Joshi', 'Nitin Chavan', 'Anjali Sharma'])[1 + (n % 6)],
  (ARRAY[
    'Possession schedule clarification requested',
    'Demand note calculation dispute raised',
    'Snagging items pending in flat handover',
    'Registration appointment rescheduling',
    'Parking allocation confirmation required',
    'Home loan disbursement documentation'
  ])[1 + (n % 6)],
  (ARRAY['Possession Handover', 'Billing Dispute', 'Construction Quality', 'General Inquiry'])[1 + (n % 4)],
  (ARRAY['Customer Care', 'Finance & Billing', 'Site Engineering', 'Legal Committee'])[1 + (n % 4)],
  (ARRAY['STANDARD', 'HIGH', 'CRITICAL', 'STANDARD'])[1 + (n % 4)],
  CASE WHEN n % 7 = 0 THEN 'BREACHED' ELSE 'ON_TRACK' END,
  (ARRAY['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'])[1 + (n % 5)],
  CASE WHEN n % 4 = 1 THEN (85000 + (n % 6) * 45000)::numeric ELSE 0 END,
  (n % 4 = 1) AND ((85000 + (n % 6) * 45000) > 100000),
  NOW() - ((n * 2) || ' days')::interval
FROM generate_series(1, 16) AS n;

INSERT INTO customer_timelines (tenant_id, customer_name, unit_number, interaction_type, summary, officer_name, timestamp)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  (ARRAY['Rajesh Kulkarni', 'Priya Deshpande', 'Sandeep Patil', 'Meera Joshi', 'Nitin Chavan'])[1 + (n % 5)],
  (300 + (n % 24))::text,
  (ARRAY['Telephonic Call', 'Site Visit', 'Email', 'Meeting', 'Payment Reminder'])[1 + (n % 5)],
  (ARRAY[
    'Discussed possession timeline and fit-out schedule.',
    'Site walkthrough conducted at the tower sample flat.',
    'Shared allotment letter and payment schedule.',
    'Reviewed loan sanction status with the buyer.',
    'Followed up on pending milestone demand note.'
  ])[1 + (n % 5)],
  (ARRAY['Sneha Kulkarni', 'Pooja Jadhav', 'Shruti Bagul'])[1 + (n % 3)],
  NOW() - ((n * 4) || ' days')::interval
FROM generate_series(1, 18) AS n;

INSERT INTO communications_approvals (tenant_id, ticket_reference, customer_name, issue_summary, claim_amount, justification, status, requires_hitl, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'TKT-00002', 'Priya Deshpande', 'Buyer disputes floor rise charges on the demand note.', 185000, 'Financial claim above executive review threshold.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'TKT-00006', 'Anjali Sharma', 'Legal notice threatened over possession delay.', 340000, 'Legal escalation requiring governance sign-off.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '1 day');

-- ============================================================================
-- SECTION 16 - EXTERNAL SYSTEMS
-- ============================================================================

INSERT INTO integration_connectors (tenant_id, connector_name, category, status, last_sync_time, synced_vouchers_24h, unreconciled_webhooks) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Tally Prime Local Bridge', 'ERP Sync', 'CONNECTED', NOW() - INTERVAL '18 minutes', 64, 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Razorpay Production Gateway', 'Payment Gateway', 'CONNECTED', NOW() - INTERVAL '6 minutes', 38, 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'HDFC Escrow Statement Feed', 'Payment Gateway', 'CONNECTED', NOW() - INTERVAL '2 hours', 12, 0),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'SAP Financial Sync', 'ERP Sync', 'DEGRADED', NOW() - INTERVAL '9 hours', 0, 7),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MahaRERA Filing Portal', 'Compliance', 'CONNECTED', NOW() - INTERVAL '1 day', 4, 0),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Oracle Enterprise ERP Bridge', 'ERP Sync', 'DISCONNECTED', NOW() - INTERVAL '6 days', 0, 0)
ON CONFLICT (connector_name) DO NOTHING;

INSERT INTO communications_integrations (tenant_id, service_name, channel_type, status, dispatched_24h, last_webhook_timestamp) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'WhatsApp Business Cloud', 'WhatsApp Business API', 'CONNECTED', 148, NOW() - INTERVAL '12 minutes'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Exotel Cloud Telephony', 'IVR Call Attribution', 'CONNECTED', 62, NOW() - INTERVAL '35 minutes'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MSG91 Transactional SMS', 'SMS Receipts', 'CONNECTED', 214, NOW() - INTERVAL '8 minutes'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Zoho Mail Relay', 'Email Dispatch', 'CONNECTED', 96, NOW() - INTERVAL '50 minutes');

INSERT INTO hardware_workspace_integrations (tenant_id, integration_name, category, status, synced_documents_or_logs, last_sync_timestamp) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Gangapur Site Weighbridge', 'Weighbridge Automation', 'CONNECTED', 184, NOW() - INTERVAL '22 minutes'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Pathardi Site Weighbridge', 'Weighbridge Automation', 'CONNECTED', 96, NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Nashik Weather Advisory Feed', 'Site Weather Diagnostics API', 'CONNECTED', 720, NOW() - INTERVAL '10 minutes'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Google Drive Document Archive', 'Workspace Productivity', 'CONNECTED', 1420, NOW() - INTERVAL '3 hours');

INSERT INTO integration_logs (tenant_id, provider_name, endpoint, payload_type, response_status, latency_ms, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  (ARRAY['Tally Prime Local Bridge', 'Razorpay Production Gateway', 'MSG91 Transactional SMS',
         'WhatsApp Business Cloud', 'SAP Financial Sync', 'HDFC Escrow Statement Feed'])[1 + (n % 6)],
  (ARRAY['/voucher/push', '/payment/webhook', '/sms/dispatch', '/message/send', '/ledger/sync', '/statement/fetch'])[1 + (n % 6)],
  (ARRAY['Voucher Batch', 'Payment Capture', 'Delivery Receipt', 'Template Message', 'Ledger Extract', 'Bank Statement'])[1 + (n % 6)],
  CASE WHEN n % 9 = 0 THEN 'FAILED' ELSE 'SUCCESS' END,
  120 + (n % 40) * 28,
  NOW() - ((n * 40) || ' minutes')::interval
FROM generate_series(1, 26) AS n;

INSERT INTO integration_approvals (tenant_id, connector_name, action_type, sync_amount, justification, status, requires_hitl, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Tally Prime Local Bridge', 'Ledger Sync', 2840000, 'Voucher batch value exceeds automated sync limit.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Razorpay Production Gateway', 'Refund Release', 185000, 'Buyer refund above gateway auto-release threshold.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'SAP Financial Sync', 'Credential Rotation', 0, 'Quarterly key rotation for the financial bridge.', 'APPROVED', true, NOW() - INTERVAL '9 days');

-- ============================================================================
-- SECTION 17 - AGENT GOVERNANCE AND ADVISORY SERVICES
-- ============================================================================

INSERT INTO mcp_registered_tools (tenant_id, tool_name, target_module, description, is_mutative, requires_hitl, execution_count, schema_input) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'fetch_project_summary', 'Construction', 'Returns development progress and milestone status.', false, false, 214, '{"projectName":"string"}'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'fetch_booking_pipeline', 'CRM', 'Returns prospect pipeline and booking conversion figures.', false, false, 186, '{"period":"string"}'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'issue_purchase_order', 'Procurement', 'Raises a purchase order against an approved vendor.', true, true, 24, '{"vendorName":"string","amount":"number"}'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'disburse_contractor_payment', 'Finance', 'Releases a contractor running account payment.', true, true, 18, '{"billReference":"string","amount":"number"}'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'draft_sale_agreement', 'Legal', 'Drafts a sale agreement from recorded booking data.', true, true, 32, '{"bookingCode":"string"}'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'schedule_site_inspection', 'Construction', 'Schedules a quality inspection at a site.', true, false, 46, '{"siteName":"string","date":"string"}'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'fetch_escrow_position', 'Finance', 'Returns MahaRERA escrow balances by development.', false, false, 92, '{"projectName":"string"}'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'generate_demand_note', 'CRM', 'Generates a milestone demand note for a buyer.', true, true, 58, '{"bookingCode":"string","milestone":"string"}')
ON CONFLICT (tool_name) DO NOTHING;

INSERT INTO mcp_agent_sessions (tenant_id, agent_title, assigned_scope, origin_ip, permission_level, last_ping, session_status) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Sales Desk Assistant', 'CRM & Sales', '103.14.220.31', 'READ_ONLY', NOW() - INTERVAL '4 minutes', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Site Operations Assistant', 'Construction', '103.14.220.44', 'READ_WRITE', NOW() - INTERVAL '11 minutes', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Finance Controls Assistant', 'Finance', '103.14.220.58', 'READ_ONLY', NOW() - INTERVAL '38 minutes', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Compliance Assistant', 'Legal & Regulatory', '49.36.180.92', 'READ_ONLY', NOW() - INTERVAL '3 hours', 'IDLE');

INSERT INTO mcp_execution_logs (tenant_id, agent_title, invoked_tool, parameters_summary, latency_ms, status, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  (ARRAY['Sales Desk Assistant', 'Site Operations Assistant', 'Finance Controls Assistant', 'Compliance Assistant'])[1 + (n % 4)],
  (ARRAY['fetch_project_summary', 'fetch_booking_pipeline', 'schedule_site_inspection', 'fetch_escrow_position', 'generate_demand_note'])[1 + (n % 5)],
  (ARRAY['projectName: Avenue Skyline', 'period: current quarter', 'siteName: Avenue Greens Site',
         'projectName: Avenue Commercia', 'bookingCode: SB-0012'])[1 + (n % 5)],
  180 + (n % 30) * 45,
  CASE WHEN n % 11 = 0 THEN 'INTERCEPTED' ELSE 'SUCCESS' END,
  NOW() - ((n * 50) || ' minutes')::interval
FROM generate_series(1, 24) AS n;

INSERT INTO mcp_approvals (tenant_id, agent_title, invoked_tool, target_module, parameters_summary, justification, status, requires_hitl, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Site Operations Assistant', 'issue_purchase_order', 'Procurement', 'vendorName: Ambika Steel Traders, amount: 2450000', 'Agent requested a purchase order above the automated limit.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '5 hours'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Finance Controls Assistant', 'disburse_contractor_payment', 'Finance', 'billReference: RA-00007, amount: 3180000', 'Disbursement request requires executive authorization.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Sales Desk Assistant', 'generate_demand_note', 'CRM', 'bookingCode: SB-0021, milestone: Plinth Completion', 'Demand note issuance to buyer awaiting review.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '40 minutes'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Compliance Assistant', 'draft_sale_agreement', 'Legal', 'bookingCode: SB-0009', 'Deed drafting completed and released after review.', 'APPROVED', true, NOW() - INTERVAL '3 days');

INSERT INTO ai_documents_legal (tenant_id, document_title, document_type, target_project_or_buyer, verification_status, requires_hitl, summary_text, generation_timestamp) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Sale Agreement - Skyline Tower A Unit 402', 'Sale Agreement', 'Rajesh Kulkarni', 'VERIFIED', false, 'Draft agreement generated from recorded booking and unit specification.', NOW() - INTERVAL '9 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Joint Development Deed - Makhmalabad', 'Joint Development Agreement', 'Nashik Agro Farms LLP', 'DRAFT', true, 'Revenue share deed prepared for legal committee review.', NOW() - INTERVAL '6 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Possession Letter - Greens Wing A Unit 304', 'Possession Letter', 'Meera Joshi', 'VERIFIED', false, 'Possession letter prepared following de-snagging clearance.', NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Minutes of Meeting - Board Review', 'Meeting Record', 'Executive Board', 'VERIFIED', false, 'Structured minutes captured from the quarterly board review.', NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Allotment Letter - Commercia Block C Unit 205', 'Allotment Letter', 'Godavari Retail Partners', 'DRAFT', true, 'Commercial allotment letter awaiting legal verification.', NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Contractor Work Order - Facade Package', 'Work Order', 'Panchavati Glass & Facade', 'VERIFIED', false, 'Work order drafted from approved facade quotation.', NOW() - INTERVAL '1 day');

INSERT INTO ai_construction_safety (tenant_id, camera_location, incident_type, risk_severity, labor_count, projected_schedule_delay_days, timestamp) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Skyline Tower A - Level 8', 'Helmet compliance lapse', 'MODERATE', 62, 0, NOW() - INTERVAL '6 hours'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Skyline Tower B - Podium', 'Harness not anchored at edge', 'HIGH', 48, 1, NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Greens Wing A - Basement', 'Unbarricaded excavation zone', 'HIGH', 35, 2, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Commercia Block C - Level 4', 'Material stacking obstruction', 'LOW', 54, 0, NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Riverfront Wing A - Site Gate', 'Low labour density against plan', 'MODERATE', 21, 3, NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Skyline Tower A - Level 11', 'Scaffolding coupler shortage', 'MODERATE', 58, 1, NOW() - INTERVAL '5 days');

INSERT INTO ai_finance_procurement (tenant_id, item_name, suggested_vendor_name, historical_quote_amount, recommended_allocation_amount, savings_percentage, cash_burn_trajectory) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'OPC 53 Grade Cement', 'UltraTech Cement - Nashik Depot', 4280000, 3950000, 7.71, 'STABLE'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Fe500D TMT Reinforcement', 'Ambika Steel Traders', 9640000, 9120000, 5.39, 'ELEVATED'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'M30 Ready Mix Concrete', 'Sahyadri Ready Mix Concrete', 6180000, 5840000, 5.50, 'STABLE'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Structural Glazing Package', 'Panchavati Glass & Facade', 12400000, 11650000, 6.05, 'ELEVATED'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LT Electrical Distribution', 'Godavari Electricals', 5320000, 4980000, 6.39, 'STABLE'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Vitrified Flooring Package', 'Trimbak Tiles & Marble', 3860000, 3610000, 6.48, 'STABLE');

INSERT INTO ai_risk_market (tenant_id, commodity_name, current_market_index_price, price_trend_recommendation, fraud_anomaly_score, customer_sentiment_score, signal_amount, requires_hitl, summary) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Cement (OPC 53 Grade)', 392, 'BUY', 4, 82, 3950000, false, 'Regional cement rates softening ahead of the monsoon restock cycle.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'TMT Steel (Fe500D)', 64500, 'HOLD', 6, 78, 9120000, false, 'Steel index stable with mild upward pressure on long products.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Ready Mix Concrete (M30)', 5850, 'BUY', 3, 80, 5840000, false, 'Local ready mix capacity improved with competitive dispatch rates.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Structural Glass', 3850, 'MONITOR', 12, 74, 11650000, true, 'Import dependency raising price volatility for facade packages.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Copper Cabling', 640, 'MONITOR', 18, 71, 4980000, true, 'Copper index volatility flagged against historical procurement quotes.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Italian Marble', 640, 'HOLD', 8, 76, 3610000, false, 'Finishing material rates steady with adequate supplier inventory.');

INSERT INTO ai_intelligence_approvals (tenant_id, title, category, target_reference, amount, justification, status, requires_hitl, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Joint development deed release', 'Legal Draft', 'JDA-0003', 0, 'Deed drafted for the Makhmalabad parcel awaiting legal sign-off.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Structural glass procurement advisory', 'Commodity Advisory', 'Facade Package', 11650000, 'Commodity buy recommendation above executive review limit.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Commercial allotment letter release', 'Legal Draft', 'Commercia Block C Unit 205', 0, 'Corporate allotment letter pending verification.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '6 hours');

-- ============================================================================
-- SECTION 18 - EXECUTIVE ANALYTICS
-- ============================================================================

INSERT INTO analytics_liquidity (tenant_id, operating_period, customer_inflows_lakhs, vendor_outflows_lakhs, debt_service_lakhs, net_operating_cashflow_lakhs, dscr_ratio, solvency_status) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Q1 FY 2025-26', 2840.00, 2110.00, 385.00, 345.00, 1.90, 'HEALTHY'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Q2 FY 2025-26', 3120.00, 2380.00, 385.00, 355.00, 1.92, 'HEALTHY'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Q3 FY 2025-26', 2960.00, 2540.00, 385.00, 35.00, 1.09, 'WATCH'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Q4 FY 2025-26', 3480.00, 2620.00, 420.00, 440.00, 2.05, 'HEALTHY'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Q1 FY 2026-27', 3760.00, 2880.00, 420.00, 460.00, 2.10, 'HEALTHY'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Q2 FY 2026-27', 3210.00, 3040.00, 465.00, -295.00, 0.94, 'WATCH');

INSERT INTO enterprise_risks (tenant_id, risk_category, associated_project_site, risk_vector_summary, impact_rating, mitigation_action_plan, risk_level, requires_hitl) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Schedule', 'Avenue Commercia - Pathardi Phata', 'Structural frame trailing plan by three weeks', 'HIGH', 'Additional shuttering crew mobilised and night shift approved.', 'High', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Regulatory', 'Avenue Riverfront - Makhmalabad', 'Title verification pending on acquired parcel', 'HIGH', 'Advocate engaged for expedited 30 year search and objection notice.', 'High', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Cost', 'Avenue Skyline - Gangapur Road', 'Facade package quoted above sanctioned allocation', 'MEDIUM', 'Alternate glazing vendor quotations invited for comparison.', 'Medium', false),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Liquidity', 'Portfolio', 'Debt service coverage dipped below target in Q2', 'MEDIUM', 'Collection drive initiated on overdue milestone demands.', 'Medium', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Sales Velocity', 'Avenue Greens - Indira Nagar', 'Booking pace slower than launch projection', 'MEDIUM', 'Channel partner incentive revised for the quarter.', 'Medium', false),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Quality', 'Avenue Skyline - Gangapur Road', 'Concrete cube strength variance in one batch', 'LOW', 'Mix design revised and additional core testing scheduled.', 'Low', false),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Supply Chain', 'Portfolio', 'Steel price volatility affecting procurement plan', 'MEDIUM', 'Forward booking arranged with the approved steel vendor.', 'Medium', false),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Safety', 'Avenue Greens - Indira Nagar', 'Repeat harness compliance observations at height', 'MEDIUM', 'Daily safety audit and contractor penalty clause enforced.', 'Medium', false);

INSERT INTO capital_allocation_requests (tenant_id, request_reference, project_name, requested_capital_lakhs, allocation_purpose, risk_rating, requires_hitl, status, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'CAP-0001', 'Avenue Commercia', 1250.00, 'Accelerated structural works to recover schedule', 'High', true, 'PENDING_BOARD_APPROVAL', NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'CAP-0002', 'Avenue Riverfront', 980.00, 'Land parcel registration and development charges', 'Medium', true, 'PENDING_BOARD_APPROVAL', NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'CAP-0003', 'Avenue Skyline', 640.00, 'Facade package advance against approved vendor', 'Medium', true, 'APPROVED', NOW() - INTERVAL '20 days');

-- ============================================================================
-- SECTION 19 - GOVERNANCE, AUDIT AND REFERENCE LISTS
-- ============================================================================

INSERT INTO security_override_requests (tenant_id, request_reference, requesting_admin_name, modification_type, target_user_or_policy, justification, requires_hitl, status, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'SEC-0001', 'Kiran Gaikwad', 'Role Elevation', 'Pooja Jadhav', 'Temporary approval authority during head of sales leave.', true, 'PENDING_GOVERNANCE_APPROVAL', NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'SEC-0002', 'Prashant Deshmukh', 'Policy Modification', 'Session timeout policy', 'Extend session timeout for site tablets on weak connectivity.', true, 'PENDING_GOVERNANCE_APPROVAL', NOW() - INTERVAL '4 hours');

INSERT INTO user_role_approvals (tenant_id, target_user_name, requested_role, requested_financial_limit, justification, status, requires_hitl, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Nikhil Sonawane', 'Procurement Lead', 1500000, 'Requires higher purchase authorization for site material orders.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Vaibhav Ahire', 'Project Director', 2500000, 'Facility handover authority for the Skyline possession phase.', 'PENDING_APPROVAL', true, NOW() - INTERVAL '1 day');

INSERT INTO audit_trail_logs (tenant_id, officer_name, module_executed, action_type, target_description, ip_address, security_verified, timestamp)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  (ARRAY['Aman Bele', 'Prashant Deshmukh', 'Sneha Kulkarni', 'Nikhil Sonawane', 'Aarti Shinde', 'Kiran Gaikwad'])[1 + (n % 6)],
  (ARRAY['Finance', 'CRM', 'Procurement', 'Construction', 'Legal', 'Settings'])[1 + (n % 6)],
  (ARRAY['AUTHORIZE', 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'EXPORT'])[1 + (n % 6)],
  (ARRAY[
    'Authorized contractor running account release',
    'Registered a new prospect against Gangapur Road',
    'Raised purchase order for cement supply',
    'Logged daily site progress for the Skyline tower',
    'Updated MahaRERA quarterly filing status',
    'Modified role permission matrix for procurement'
  ])[1 + (n % 6)],
  (ARRAY['103.14.220.12', '103.14.220.31', '49.36.180.77', '103.14.220.58'])[1 + (n % 4)],
  true,
  NOW() - ((n * 5) || ' hours')::interval
FROM generate_series(1, 30) AS n;

INSERT INTO event_stream_logs (tenant_id, event_name, origin_module, target_module, payload_summary, status, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  (ARRAY['booking.confirmed', 'voucher.authorized', 'purchase_order.raised', 'dpr.submitted', 'ticket.escalated', 'rera.filed'])[1 + (n % 6)],
  (ARRAY['CRM', 'Finance', 'Procurement', 'Construction', 'Communications', 'Legal'])[1 + (n % 6)],
  (ARRAY['Finance', 'Analytics', 'Inventory', 'Analytics', 'Governance', 'Compliance'])[1 + (n % 6)],
  (ARRAY[
    'Booking confirmed and receivable posted to ledger',
    'Disbursement authorized and released to contractor',
    'Purchase order raised against approved vendor',
    'Daily progress report submitted from site',
    'Support ticket escalated for executive review',
    'Quarterly regulatory return filed successfully'
  ])[1 + (n % 6)],
  CASE WHEN n % 13 = 0 THEN 'RETRIED' ELSE 'DELIVERED' END,
  NOW() - ((n * 45) || ' minutes')::interval
FROM generate_series(1, 30) AS n;

INSERT INTO system_notifications (id, tenant_id, src_module, user_type, type, description, action_link, priority, is_read, timestamp)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  (ARRAY['Finance', 'CRM', 'Construction', 'Legal', 'Procurement'])[1 + (n % 5)],
  'Governance Director',
  (ARRAY['APPROVAL', 'ALERT', 'INFORMATION', 'ALERT', 'APPROVAL'])[1 + (n % 5)],
  (ARRAY[
    'Disbursement voucher awaiting executive authorization',
    'New prospect captured from the property portal',
    'Contractor claim exceeds the authorization threshold',
    'MahaRERA quarterly return pending for two developments',
    'Purchase order awaiting procurement director release'
  ])[1 + (n % 5)],
  (ARRAY['/finance', '/crm', '/construction', '/legal', '/procurement'])[1 + (n % 5)],
  (ARRAY['HIGH', 'MEDIUM', 'HIGH', 'MEDIUM', 'LOW'])[1 + (n % 5)],
  n % 3 = 0,
  NOW() - ((n * 90) || ' minutes')::interval
FROM generate_series(1, 12) AS n;

INSERT INTO master_catalog_options (tenant_id, category, option_value, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'DEPARTMENT', 'Executive Administration', 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'DEPARTMENT', 'Sales & Customer Relations', 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'DEPARTMENT', 'Finance & Accounts', 3),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'DEPARTMENT', 'Site Construction Operations', 4),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'DEPARTMENT', 'Project Engineering & Quality', 5),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'DEPARTMENT', 'Procurement & Logistics', 6),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'DEPARTMENT', 'Legal & Land Acquisition', 7),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'DEPARTMENT', 'Property & Facility', 8),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'SITE_LOCATION', 'Gangapur Road Site', 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'SITE_LOCATION', 'Indira Nagar Site', 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'SITE_LOCATION', 'Pathardi Phata Site', 3),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'SITE_LOCATION', 'Makhmalabad Site', 4),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'SITE_LOCATION', 'Nashik Corporate Headquarters', 5),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'UNIT_TYPOLOGY', '2 BHK Luxury Apartment', 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'UNIT_TYPOLOGY', '3 BHK Executive Suite', 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'UNIT_TYPOLOGY', '4 BHK Penthouse Residence', 3),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'UNIT_TYPOLOGY', 'Commercial Retail Unit', 4),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'FACING_DIRECTION', 'East', 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'FACING_DIRECTION', 'West', 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'FACING_DIRECTION', 'North', 3),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'FACING_DIRECTION', 'South', 4),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'PARKING_TYPE', '1 Covered Bay', 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'PARKING_TYPE', '2 Covered Bays', 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'PARKING_TYPE', 'Tandem Parking Slot', 3),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'WORKFORCE_TYPE', 'Permanent', 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'WORKFORCE_TYPE', 'Contract', 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'WORKFORCE_TYPE', 'Daily Wage', 3),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LEAD_SOURCE', 'Web Form', 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LEAD_SOURCE', 'WhatsApp', 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LEAD_SOURCE', 'Property Portal', 3),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LEAD_SOURCE', 'Walk-In', 4),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LEAD_SOURCE', 'IVR Call', 5),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MATERIAL_CATEGORY', 'Cement', 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MATERIAL_CATEGORY', 'Steel & TMT', 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MATERIAL_CATEGORY', 'Ready Mix Concrete', 3),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MATERIAL_CATEGORY', 'Electrical', 4),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MATERIAL_CATEGORY', 'Plumbing', 5),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MATERIAL_CATEGORY', 'Finishing Material', 6),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MATERIAL_CATEGORY', 'Facade & Glazing', 7),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MATERIAL_CATEGORY', 'Site Safety', 8),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'MATERIAL_CATEGORY', 'Waterproofing', 9),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'ASSET_CATEGORY', 'Elevators', 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'ASSET_CATEGORY', 'Power Backup', 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'ASSET_CATEGORY', 'Fire Safety', 3),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'ASSET_CATEGORY', 'Water Management', 4),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'ASSET_CATEGORY', 'HVAC', 5),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'ASSET_CATEGORY', 'Security Systems', 6),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'ASSET_CATEGORY', 'Renewable Energy', 7),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'TICKET_CATEGORY', 'Electrical', 1),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'TICKET_CATEGORY', 'Plumbing', 2),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'TICKET_CATEGORY', 'Elevators', 3),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'TICKET_CATEGORY', 'Fire Safety', 4),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'TICKET_CATEGORY', 'Housekeeping', 5)
ON CONFLICT (tenant_id, category, option_value) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Developments' AS register, COUNT(*)::text AS records FROM master_project WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
UNION ALL SELECT 'Units', COUNT(*)::text FROM master_unit WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
UNION ALL SELECT 'Bookings', COUNT(*)::text FROM sales_bookings WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
UNION ALL SELECT 'Prospects', COUNT(*)::text FROM crm_leads WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
UNION ALL SELECT 'Customers', COUNT(*)::text FROM master_customer WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
UNION ALL SELECT 'Vendors', COUNT(*)::text FROM master_vendor WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
UNION ALL SELECT 'Contractor Claims', COUNT(*)::text FROM contractor_ra_bills WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
UNION ALL SELECT 'Purchase Orders', COUNT(*)::text FROM purchase_orders WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
UNION ALL SELECT 'Budget Heads', COUNT(*)::text FROM budget_heads WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
UNION ALL SELECT 'Support Tickets', COUNT(*)::text FROM support_tickets WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY register;

