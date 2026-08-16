-- 009_runtime_registers.sql
-- Consolidated from CREATE TABLE / CREATE INDEX / ALTER TABLE statements that were
-- previously issued at request time by API route handlers. Migrations now own this schema.
-- Idempotent: safe against both a clean database and an existing deployment.

-- source: src/app/api/v1/ai-intelligence/approvals/route.ts
CREATE TABLE IF NOT EXISTS ai_intelligence_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        target_reference VARCHAR(255) NOT NULL,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        justification TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/ai-intelligence/construction-safety/route.ts
CREATE TABLE IF NOT EXISTS ai_construction_safety (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        camera_location VARCHAR(255) NOT NULL,
        incident_type VARCHAR(100) NOT NULL,
        risk_severity VARCHAR(50) NOT NULL DEFAULT 'MODERATE',
        labor_count INT NOT NULL DEFAULT 0,
        projected_schedule_delay_days INT NOT NULL DEFAULT 0,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/ai-intelligence/documents-legal/route.ts
CREATE TABLE IF NOT EXISTS ai_documents_legal (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        document_title VARCHAR(255) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        target_project_or_buyer VARCHAR(255) NOT NULL,
        generation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verification_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        summary_text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/ai-intelligence/finance-procurement/route.ts
CREATE TABLE IF NOT EXISTS ai_finance_procurement (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        suggested_vendor_name VARCHAR(255) NOT NULL,
        historical_quote_amount NUMERIC(15,2) NOT NULL,
        recommended_allocation_amount NUMERIC(15,2) NOT NULL,
        savings_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
        cash_burn_trajectory VARCHAR(50) NOT NULL DEFAULT 'STABLE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/ai-intelligence/risk-market/route.ts
CREATE TABLE IF NOT EXISTS ai_risk_market (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        commodity_name VARCHAR(100) NOT NULL,
        current_market_index_price NUMERIC(15,2) NOT NULL,
        price_trend_recommendation VARCHAR(50) NOT NULL DEFAULT 'MONITOR',
        fraud_anomaly_score INT NOT NULL DEFAULT 0,
        customer_sentiment_score INT NOT NULL DEFAULT 75,
        signal_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        summary TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/analytics/approvals/route.ts
CREATE TABLE IF NOT EXISTS capital_allocation_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
            request_reference VARCHAR(100) NOT NULL,
            project_name VARCHAR(255) NOT NULL,
            requested_capital_lakhs DECIMAL(15,2) NOT NULL,
            allocation_purpose VARCHAR(255) NOT NULL,
            risk_rating VARCHAR(50) NOT NULL DEFAULT 'Medium',
            requires_hitl BOOLEAN NOT NULL DEFAULT true,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING_BOARD_APPROVAL',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/analytics/liquidity/route.ts
CREATE TABLE IF NOT EXISTS analytics_liquidity (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            operating_period VARCHAR(50) NOT NULL,
            customer_inflows_lakhs DECIMAL(15,2) NOT NULL,
            vendor_outflows_lakhs DECIMAL(15,2) NOT NULL,
            debt_service_lakhs DECIMAL(15,2) NOT NULL,
            net_operating_cashflow_lakhs DECIMAL(15,2) NOT NULL,
            dscr_ratio DECIMAL(5,2) NOT NULL,
            solvency_status VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/analytics/risk/route.ts
CREATE TABLE IF NOT EXISTS enterprise_risks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
            risk_category VARCHAR(100) NOT NULL,
            associated_project_site VARCHAR(255) NOT NULL,
            risk_vector_summary VARCHAR(255) NOT NULL,
            impact_rating VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
            mitigation_action_plan TEXT NOT NULL,
            risk_level VARCHAR(50) NOT NULL DEFAULT 'Medium',
            requires_hitl BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/auth/login/route.ts
CREATE TABLE IF NOT EXISTS system_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL DEFAULT 'pbkdf2_sha256$default_hash',
        department VARCHAR(100) NOT NULL,
        designation VARCHAR(100) NOT NULL,
        site_location VARCHAR(255) NOT NULL DEFAULT 'Nashik Corporate Office',
        mfa_enabled BOOLEAN NOT NULL DEFAULT true,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        role VARCHAR(100) NOT NULL DEFAULT 'Site Engineer',
        last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/communications/approvals/route.ts
CREATE TABLE IF NOT EXISTS communications_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        ticket_reference VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        issue_summary TEXT NOT NULL,
        claim_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        justification TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/communications/channels/route.ts
CREATE TABLE IF NOT EXISTS chat_channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        channel_name VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        is_private BOOLEAN NOT NULL DEFAULT false,
        member_count INT NOT NULL DEFAULT 1,
        last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/communications/customer-timeline/route.ts
CREATE TABLE IF NOT EXISTS customer_timelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        unit_number VARCHAR(100) NOT NULL,
        interaction_type VARCHAR(100) NOT NULL,
        summary TEXT NOT NULL,
        officer_name VARCHAR(255) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/communications/messages/route.ts
CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        channel_id UUID NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        sender_role VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        is_pinned BOOLEAN NOT NULL DEFAULT false,
        action_link_url TEXT,
        action_link_label TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/communications/tickets/route.ts
CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        ticket_reference VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        assigned_department VARCHAR(100) NOT NULL,
        priority VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
        sla_status VARCHAR(50) NOT NULL DEFAULT 'ON_TRACK',
        status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
        claim_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/facility/assets/route.ts
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
      maintenance_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/facility/cam-invoices/route.ts
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

-- source: src/app/api/v1/facility/handovers/route.ts
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

-- source: src/app/api/v1/facility/tickets/route.ts
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
      rejection_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/finance/tally/banking/e-brs/route.ts
CREATE TABLE IF NOT EXISTS tally_bank_statements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      description TEXT NOT NULL,
      reference_number VARCHAR(100) NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      type VARCHAR(20) NOT NULL DEFAULT 'CREDIT',
      status VARCHAR(50) NOT NULL DEFAULT 'UNRECONCILED',
      match_confidence_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/finance/tally/chart-of-accounts/route.ts
CREATE TABLE IF NOT EXISTS tally_chart_of_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      primary_group VARCHAR(100) NOT NULL,
      sub_group VARCHAR(100) NOT NULL,
      ledger_name VARCHAR(255) NOT NULL,
      ledger_type VARCHAR(50) NOT NULL DEFAULT 'BALANCE_SHEET',
      opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
      gstin VARCHAR(20),
      pan VARCHAR(20),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/finance/tally/inventory/bom/route.ts
CREATE TABLE IF NOT EXISTS tally_bill_of_materials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      recipe_name VARCHAR(255) NOT NULL,
      finished_goods_item_name VARCHAR(255) NOT NULL,
      component_item_name VARCHAR(255) NOT NULL,
      standard_quantity DECIMAL(15,4) NOT NULL DEFAULT 1.0,
      overhead_cost_allocation_pct DECIMAL(5,2) NOT NULL DEFAULT 5.0,
      scrap_rate_pct DECIMAL(5,2) NOT NULL DEFAULT 1.0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/finance/tally/inventory/godowns/route.ts
CREATE TABLE IF NOT EXISTS tally_godowns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      godown_name VARCHAR(255) NOT NULL,
      parent_godown_id UUID,
      rack_location VARCHAR(100),
      bin_number VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/finance/tally/inventory/godowns/route.ts
CREATE TABLE IF NOT EXISTS tally_stock_batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      godown_id UUID,
      item_name VARCHAR(255) NOT NULL,
      batch_number VARCHAR(100) NOT NULL,
      manufacture_date TIMESTAMPTZ,
      expiry_date TIMESTAMPTZ,
      quantity DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      valuation_method VARCHAR(50) NOT NULL DEFAULT 'FIFO',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/finance/tally/statutory/gst/route.ts
CREATE TABLE IF NOT EXISTS tally_gstr_mismatches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      vendor_name VARCHAR(255) NOT NULL,
      invoice_number VARCHAR(100) NOT NULL,
      invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      portal_itc_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      books_itc_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      variance_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) NOT NULL DEFAULT 'MISMATCH_FLAGGED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/finance/tally/statutory/tds-msme/route.ts
CREATE TABLE IF NOT EXISTS tally_msme_compliance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      vendor_name VARCHAR(255) NOT NULL,
      msme_category VARCHAR(50) NOT NULL DEFAULT 'MICRO',
      agreement_exists BOOLEAN NOT NULL DEFAULT true,
      payment_window_days INT NOT NULL DEFAULT 45,
      invoice_number VARCHAR(100),
      invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      overdue_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      tax_disallowance_risk BOOLEAN NOT NULL DEFAULT false,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/finance/tally/statutory/tds-msme/route.ts
CREATE TABLE IF NOT EXISTS tally_mca_edit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      voucher_id UUID NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_id VARCHAR(255) NOT NULL,
      ip_address VARCHAR(50) NOT NULL DEFAULT '127.0.0.1',
      field_changes_json TEXT NOT NULL
    );

-- source: src/app/api/v1/finance/tally/vouchers/route.ts
CREATE TABLE IF NOT EXISTS tally_vouchers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      voucher_type VARCHAR(50) NOT NULL,
      voucher_number VARCHAR(100) NOT NULL,
      posting_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      narration TEXT,
      is_optional BOOLEAN NOT NULL DEFAULT false,
      is_reversing BOOLEAN NOT NULL DEFAULT false,
      total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) NOT NULL DEFAULT 'POSTED',
      requires_hitl BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/finance/tally/vouchers/route.ts
CREATE TABLE IF NOT EXISTS tally_voucher_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      voucher_id UUID NOT NULL,
      ledger_id UUID NOT NULL,
      cost_center_id VARCHAR(100),
      debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      fx_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
      bill_reference_type VARCHAR(50),
      bill_number VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/finance/vouchers/route.ts
CREATE TABLE IF NOT EXISTS finance_vouchers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        voucher_reference VARCHAR(100) NOT NULL,
        payee_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        description TEXT NOT NULL,
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL DEFAULT 'POSTED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/hr/approvals/route.ts
CREATE TABLE IF NOT EXISTS hr_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        reference_name VARCHAR(255) NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        justification TEXT NOT NULL,
        requested_by VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/hr/attendance/route.ts
CREATE TABLE IF NOT EXISTS hr_attendance_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        site_location VARCHAR(100) NOT NULL,
        check_in_time VARCHAR(50) NOT NULL,
        check_out_time VARCHAR(50) NOT NULL,
        device_status VARCHAR(50) NOT NULL DEFAULT 'SYNCED',
        overtime_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/hr/employees/route.ts
CREATE TABLE IF NOT EXISTS hr_employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        designation VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        site_location VARCHAR(100) NOT NULL,
        workforce_type VARCHAR(50) NOT NULL DEFAULT 'Permanent',
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        joining_date VARCHAR(50) NOT NULL,
        corporate_email VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/hr/payroll/route.ts
CREATE TABLE IF NOT EXISTS hr_payroll_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        cycle_month VARCHAR(50) NOT NULL,
        total_gross_salary NUMERIC(15,2) NOT NULL,
        total_pf_deduction NUMERIC(15,2) NOT NULL,
        total_esic_deduction NUMERIC(15,2) NOT NULL,
        total_pt_deduction NUMERIC(15,2) NOT NULL,
        approved_expenses NUMERIC(15,2) NOT NULL DEFAULT 0,
        net_payable NUMERIC(15,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        employee_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/hr/performance/route.ts
CREATE TABLE IF NOT EXISTS hr_performance_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        is_trainee BOOLEAN NOT NULL DEFAULT false,
        department VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        target_score INT NOT NULL DEFAULT 100,
        achieved_score INT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'ON_TRACK',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/hr/recruitment/route.ts
CREATE TABLE IF NOT EXISTS hr_candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        candidate_name VARCHAR(255) NOT NULL,
        target_position VARCHAR(100) NOT NULL,
        experience_level VARCHAR(50) NOT NULL,
        current_stage VARCHAR(50) NOT NULL DEFAULT 'Applied',
        interview_score INT NOT NULL DEFAULT 0,
        contact_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/integrations/approvals/route.ts
CREATE TABLE IF NOT EXISTS integration_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        connector_name VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        sync_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        justification TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/integrations/communications/route.ts
CREATE TABLE IF NOT EXISTS communications_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        service_name VARCHAR(100) NOT NULL,
        channel_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
        dispatched_24h INT NOT NULL DEFAULT 0,
        last_webhook_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/integrations/connectors/route.ts
CREATE TABLE IF NOT EXISTS integration_connectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        connector_name VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
        last_sync_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        synced_vouchers_24h INT NOT NULL DEFAULT 0,
        unreconciled_webhooks INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/integrations/hardware/route.ts
CREATE TABLE IF NOT EXISTS hardware_workspace_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        integration_name VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
        synced_documents_or_logs INT NOT NULL DEFAULT 0,
        last_sync_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/integrations/logs/route.ts
CREATE TABLE IF NOT EXISTS integration_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        provider_name VARCHAR(100) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        payload_type VARCHAR(100) NOT NULL,
        response_status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
        latency_ms INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/legal/jdas/route.ts
CREATE TABLE IF NOT EXISTS jda_contracts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            agreement_reference VARCHAR(100) NOT NULL,
            landowner_name VARCHAR(255) NOT NULL,
            project_site VARCHAR(255) NOT NULL,
            developer_share_pct DECIMAL(5,2) NOT NULL,
            landowner_share_pct DECIMAL(5,2) NOT NULL,
            escrow_account_status VARCHAR(50) NOT NULL,
            contract_status VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/legal/parcels/route.ts
CREATE TABLE IF NOT EXISTS land_parcels (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            parcel_reference VARCHAR(100) NOT NULL,
            parcel_description VARCHAR(255) NOT NULL,
            location_zone VARCHAR(255) NOT NULL,
            plot_area_acres DECIMAL(15,2) NOT NULL,
            applicable_fsi DECIMAL(5,2) NOT NULL,
            base_land_value_amount DECIMAL(15,2) NOT NULL,
            stamp_duty_amount DECIMAL(15,2) NOT NULL,
            registration_amount DECIMAL(15,2) NOT NULL,
            total_outlay_amount DECIMAL(15,2) NOT NULL,
            title_status VARCHAR(100) NOT NULL,
            acquisition_phase VARCHAR(50) NOT NULL,
            requires_hitl BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/legal/rera/route.ts
CREATE TABLE IF NOT EXISTS rera_compliances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      project_name VARCHAR(255) NOT NULL,
      rera_reg_reference VARCHAR(100) NOT NULL,
      quarterly_return_status VARCHAR(50) NOT NULL DEFAULT 'COMPLIANT',
      escrow_balance_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      form1_status BOOLEAN NOT NULL DEFAULT false,
      form2_status BOOLEAN NOT NULL DEFAULT false,
      form3_status BOOLEAN NOT NULL DEFAULT false,
      certificate_audit_status VARCHAR(100) NOT NULL DEFAULT 'Compliant',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/legal/title-searches/route.ts
CREATE TABLE IF NOT EXISTS title_search_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      survey_number VARCHAR(100) NOT NULL,
      legal_advocate VARCHAR(255) NOT NULL,
      search_period_years INTEGER NOT NULL DEFAULT 30,
      encumbrance_status VARCHAR(100) NOT NULL DEFAULT 'Clear',
      extract_verified_712 BOOLEAN NOT NULL DEFAULT false,
      risk_rating VARCHAR(50) NOT NULL DEFAULT 'LOW',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/mcp/approvals/route.ts
CREATE TABLE IF NOT EXISTS mcp_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        agent_title VARCHAR(255) NOT NULL,
        invoked_tool VARCHAR(100) NOT NULL,
        target_module VARCHAR(100) NOT NULL,
        parameters_summary TEXT NOT NULL,
        justification TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/mcp/logs/route.ts
CREATE TABLE IF NOT EXISTS mcp_execution_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        agent_title VARCHAR(255) NOT NULL,
        invoked_tool VARCHAR(100) NOT NULL,
        parameters_summary TEXT NOT NULL,
        latency_ms INT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/mcp/route.ts
CREATE TABLE IF NOT EXISTS mcp_registered_tools (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          tool_name VARCHAR(100) UNIQUE NOT NULL,
          target_module VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          is_mutative BOOLEAN NOT NULL DEFAULT false,
          requires_hitl BOOLEAN NOT NULL DEFAULT false,
          execution_count INT NOT NULL DEFAULT 0,
          schema_input TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

-- source: src/app/api/v1/mcp/sessions/route.ts
CREATE TABLE IF NOT EXISTS mcp_agent_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        agent_title VARCHAR(255) NOT NULL,
        assigned_scope VARCHAR(100) NOT NULL,
        origin_ip VARCHAR(50) NOT NULL,
        permission_level VARCHAR(50) NOT NULL DEFAULT 'READ_ONLY',
        last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        session_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/procurement/grn/route.ts
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

-- source: src/app/api/v1/procurement/inventory/route.ts
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

-- source: src/app/api/v1/procurement/orders/route.ts
CREATE TABLE IF NOT EXISTS purchase_orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            order_reference VARCHAR(100) NOT NULL,
            site_name VARCHAR(255) NOT NULL,
            vendor_name VARCHAR(255) NOT NULL,
            material_description VARCHAR(255) NOT NULL,
            quantity DECIMAL(15,2) NOT NULL,
            unit_rate DECIMAL(15,2) NOT NULL,
            freight_amount DECIMAL(15,2) NOT NULL,
            gst_amount DECIMAL(15,2) NOT NULL,
            order_value_amount DECIMAL(15,2) NOT NULL,
            delivery_due_date DATE NOT NULL,
            requires_hitl BOOLEAN NOT NULL DEFAULT false,
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/settings/approvals/route.ts
CREATE TABLE IF NOT EXISTS security_override_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            request_reference VARCHAR(100) NOT NULL,
            requesting_admin_name VARCHAR(255) NOT NULL,
            modification_type VARCHAR(100) NOT NULL,
            target_user_or_policy VARCHAR(255) NOT NULL,
            justification TEXT NOT NULL,
            requires_hitl BOOLEAN NOT NULL DEFAULT true,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING_GOVERNANCE_APPROVAL',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/settings/audit-logs/route.ts
CREATE TABLE IF NOT EXISTS audit_trail_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            officer_name VARCHAR(255) NOT NULL,
            module_executed VARCHAR(100) NOT NULL,
            action_type VARCHAR(50) NOT NULL,
            target_description TEXT NOT NULL,
            ip_address VARCHAR(50) NOT NULL,
            security_verified BOOLEAN NOT NULL DEFAULT true,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/settings/catalog/route.ts
CREATE TABLE IF NOT EXISTS master_catalog_options (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      category VARCHAR(100) NOT NULL,
      option_value VARCHAR(255) NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_catalog_option UNIQUE (tenant_id, category, option_value)
    );

-- source: src/app/api/v1/settings/roles/route.ts
CREATE TABLE IF NOT EXISTS system_role_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            role_name VARCHAR(100) UNIQUE NOT NULL,
            can_read BOOLEAN NOT NULL DEFAULT true,
            can_create BOOLEAN NOT NULL DEFAULT false,
            can_update BOOLEAN NOT NULL DEFAULT false,
            can_delete BOOLEAN NOT NULL DEFAULT false,
            can_authorize_hitl BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/settings/security/route.ts
CREATE TABLE IF NOT EXISTS security_policies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            mfa_enforced BOOLEAN NOT NULL DEFAULT true,
            whitelisted_ip_ranges TEXT[] NOT NULL DEFAULT ARRAY['192.168.1.0/24'],
            session_timeout_minutes INT NOT NULL DEFAULT 30,
            password_rotation_days INT NOT NULL DEFAULT 90,
            super_admin_elevation_hitl BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/settings/tenant/route.ts
CREATE TABLE IF NOT EXISTS tenant_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            organization_legal_name VARCHAR(255) NOT NULL,
            gstin_registration VARCHAR(50) NOT NULL,
            registered_address TEXT NOT NULL,
            operational_timezone VARCHAR(100) NOT NULL,
            base_currency VARCHAR(50) NOT NULL,
            fiscal_year_cycle VARCHAR(100) NOT NULL,
            active_users_count INT NOT NULL DEFAULT 1,
            active_site_accounts_count INT NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

-- source: src/app/api/v1/settings/users/route.ts
CREATE TABLE IF NOT EXISTS user_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      corporate_email VARCHAR(255) NOT NULL,
      assigned_role VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL,
      account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      last_active_date VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- source: src/app/api/v1/settings/users/route.ts
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts (LOWER(corporate_email));

-- source: src/app/api/v1/system/event-stream/route.ts
CREATE TABLE IF NOT EXISTS event_stream_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        event_name VARCHAR(100) NOT NULL,
        origin_module VARCHAR(100) NOT NULL,
        target_module VARCHAR(100) NOT NULL,
        payload_summary TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DELIVERED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/users/approvals/route.ts
CREATE TABLE IF NOT EXISTS user_role_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        target_user_name VARCHAR(255) NOT NULL,
        requested_role VARCHAR(100) NOT NULL,
        requested_financial_limit NUMERIC(15,2) NOT NULL DEFAULT 0,
        justification TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

-- source: src/app/api/v1/users/sessions/route.ts
CREATE TABLE IF NOT EXISTS system_user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      device_name VARCHAR(255) NOT NULL,
      ip_address VARCHAR(64) NOT NULL,
      is_current_device BOOLEAN NOT NULL DEFAULT false,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

