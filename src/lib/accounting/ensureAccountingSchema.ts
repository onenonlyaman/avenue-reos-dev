import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

let isSchemaEnsured = false;

/**
 * Initializes, migrates, and verifies all Tally ERP subsystem tables, indexes,
 * default account groups, and statutory rules for the active tenant.
 */
export async function ensureAccountingSchema(): Promise<void> {
  if (isSchemaEnsured) return;

  const tenantId = ACTIVE_TENANT_ID;

  await runtimeDdl("tally:core_schema_v2", async () => {
    // 1. Account Groups
    await prisma.$executeRaw`
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
    `;
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_groups ADD COLUMN IF NOT EXISTS nature VARCHAR(20) DEFAULT 'ASSET'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_groups ADD COLUMN IF NOT EXISTS path TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_groups ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);

    // 2. Cost Centers
    await prisma.$executeRaw`
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
    `;

    // 3. Account Ledgers
    await prisma.$executeRaw`
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
    `;
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS book_type VARCHAR(20) DEFAULT 'STATUTORY'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS gstin VARCHAR(20)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS pan VARCHAR(20)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(10)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS is_tds_applicable BOOLEAN DEFAULT FALSE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS tds_section VARCHAR(20)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS bank_ifsc_code VARCHAR(20)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS credit_period_days INT DEFAULT 30`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS is_msme BOOLEAN DEFAULT FALSE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS msme_category VARCHAR(20)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_account_ledgers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);

    // 4. Vouchers
    await prisma.$executeRaw`
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
    `;
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_vouchers ADD COLUMN IF NOT EXISTS voucher_date DATE DEFAULT CURRENT_DATE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_vouchers ADD COLUMN IF NOT EXISTS posting_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_vouchers ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_vouchers ADD COLUMN IF NOT EXISTS book_type VARCHAR(20) DEFAULT 'STATUTORY'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_vouchers ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_vouchers ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,4) DEFAULT 1.0000`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_vouchers ADD COLUMN IF NOT EXISTS requires_hitl BOOLEAN DEFAULT FALSE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_vouchers ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(100) DEFAULT 'usr-default'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_vouchers ADD COLUMN IF NOT EXISTS region_code VARCHAR(10) DEFAULT 'NAS'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_vouchers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);

    // 5. Voucher Line Items
    await prisma.$executeRaw`
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
        line_number INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_voucher_items ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES tally_cost_centers(id)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_voucher_items ADD COLUMN IF NOT EXISTS bill_reference VARCHAR(100)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_voucher_items ADD COLUMN IF NOT EXISTS particulars TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_voucher_items ADD COLUMN IF NOT EXISTS line_number INT DEFAULT 1`);

    // 6. Bill-by-Bill References
    await prisma.$executeRaw`
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
    `;
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_bill_references ADD COLUMN IF NOT EXISTS book_type VARCHAR(20) DEFAULT 'STATUTORY'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tally_bill_references ADD COLUMN IF NOT EXISTS interest_rate_pct NUMERIC(5,2) DEFAULT 18.00`);

    // 7. Cash Vault Sessions
    await prisma.$executeRaw`
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
    `;

    // 8. CRM Booking Splits
    await prisma.$executeRaw`
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
    `;

    // 9. Inventory Godowns, Stock Items & BOM
    await prisma.$executeRaw`
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
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS tally_stock_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        group_code VARCHAR(50) NOT NULL,
        group_name VARCHAR(150) NOT NULL,
        parent_group_id UUID REFERENCES tally_stock_groups(id),
        CONSTRAINT uq_tally_sgroup_code UNIQUE (tenant_id, group_code)
      );
    `;

    await prisma.$executeRaw`
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
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS tally_bom_recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        bom_name VARCHAR(150) NOT NULL,
        finished_item_id UUID NOT NULL REFERENCES tally_stock_items(id),
        yield_quantity NUMERIC(15,2) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS tally_bom_components (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        bom_id UUID NOT NULL REFERENCES tally_bom_recipes(id) ON DELETE CASCADE,
        component_item_id UUID NOT NULL REFERENCES tally_stock_items(id),
        quantity NUMERIC(15,2) NOT NULL,
        scrap_rate_pct NUMERIC(5,2) DEFAULT 0.00
      );
    `;

    // 10. GST E-Invoicing & Reconciliations
    await prisma.$executeRaw`
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
    `;

    await prisma.$executeRaw`
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
    `;

    // 11. Bank Statements & e-BRS
    await prisma.$executeRaw`
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
    `;

    await prisma.$executeRaw`
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
    `;

    // 12. Statutory Rules Engine
    await prisma.$executeRaw`
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
    `;

    // 13. MCA Mandatory Append-Only Audit Trail
    await prisma.$executeRaw`
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
    `;

    // Seed Standard Account Groups for this tenant if empty
    const groupCount = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count FROM tally_account_groups WHERE tenant_id = ${tenantId}::uuid
    `;

    if (!groupCount[0] || groupCount[0].count === 0) {
      const defaultGroups = [
        { code: 'GRP-100', name: 'Bank & Cash Accounts', nature: 'ASSET' },
        { code: 'GRP-200', name: 'Sundry Debtors (Receivables)', nature: 'ASSET' },
        { code: 'GRP-210', name: 'Inventory & Stock Assets', nature: 'ASSET' },
        { code: 'GRP-300', name: 'Sundry Creditors (Payables)', nature: 'LIABILITY' },
        { code: 'GRP-400', name: 'Duties & Taxes (GST/TDS)', nature: 'LIABILITY' },
        { code: 'GRP-410', name: 'Capital & Secured Loans', nature: 'LIABILITY' },
        { code: 'GRP-500', name: 'Sales & Revenue Accounts', nature: 'INCOME' },
        { code: 'GRP-600', name: 'Direct Project Expenses', nature: 'EXPENSE' },
        { code: 'GRP-610', name: 'Indirect & Administrative Expenses', nature: 'EXPENSE' },
      ];

      for (const g of defaultGroups) {
        await prisma.$executeRaw`
          INSERT INTO tally_account_groups (tenant_id, group_code, group_name, nature, is_system)
          VALUES (${tenantId}::uuid, ${g.code}, ${g.name}, ${g.nature}, true)
          ON CONFLICT (tenant_id, group_code) DO NOTHING;
        `;
      }

      // Seed standard demo ledgers under groups
      const bankGroup = await prisma.$queryRaw<any[]>`
        SELECT id FROM tally_account_groups WHERE tenant_id = ${tenantId}::uuid AND group_code = 'GRP-100' LIMIT 1
      `;
      const debtorGroup = await prisma.$queryRaw<any[]>`
        SELECT id FROM tally_account_groups WHERE tenant_id = ${tenantId}::uuid AND group_code = 'GRP-200' LIMIT 1
      `;
      const creditorGroup = await prisma.$queryRaw<any[]>`
        SELECT id FROM tally_account_groups WHERE tenant_id = ${tenantId}::uuid AND group_code = 'GRP-300' LIMIT 1
      `;
      const salesGroup = await prisma.$queryRaw<any[]>`
        SELECT id FROM tally_account_groups WHERE tenant_id = ${tenantId}::uuid AND group_code = 'GRP-500' LIMIT 1
      `;

      if (bankGroup[0] && debtorGroup[0] && creditorGroup[0] && salesGroup[0]) {
        await prisma.$executeRaw`
          INSERT INTO tally_account_ledgers (
            tenant_id, ledger_code, ledger_name, group_id, book_type,
            opening_balance, current_balance, currency, bank_account_number, bank_ifsc_code
          ) VALUES 
          (${tenantId}::uuid, 'LED-HDFC-01', 'HDFC Corporate Current Account', ${bankGroup[0].id}::uuid, 'STATUTORY', 5000000.00, 5000000.00, 'INR', '50200098765432', 'HDFC0000123'),
          (${tenantId}::uuid, 'LED-ICICI-01', 'ICICI Project Escrow Account', ${bankGroup[0].id}::uuid, 'STATUTORY', 2500000.00, 2500000.00, 'INR', '001105009988', 'ICIC0000011'),
          (${tenantId}::uuid, 'LED-CASH-01', 'Physical Cash Chest (Vault)', ${bankGroup[0].id}::uuid, 'INTERNAL', 500000.00, 500000.00, 'INR', NULL, NULL),
          (${tenantId}::uuid, 'LED-DEB-01', 'Plot Buyers & Customers Control Account', ${debtorGroup[0].id}::uuid, 'STATUTORY', 12000000.00, 12000000.00, 'INR', NULL, NULL),
          (${tenantId}::uuid, 'LED-CRED-01', 'UltraTech Cement & Raw Material Vendors', ${creditorGroup[0].id}::uuid, 'STATUTORY', 3500000.00, 3500000.00, 'INR', NULL, NULL),
          (${tenantId}::uuid, 'LED-SALES-01', 'Real Estate Plot & Unit Sales Revenue', ${salesGroup[0].id}::uuid, 'STATUTORY', 0.00, 0.00, 'INR', NULL, NULL)
          ON CONFLICT (tenant_id, ledger_code) DO NOTHING;
        `;
      }

      // Seed Budget 2026 Statutory Rules
      const budget2026Rules = [
        {
          code: 'GST-STD-2026',
          category: 'GST_RATE',
          from: '2026-04-01',
          payload: JSON.stringify({
            standardSlabs: [0, 5, 12, 18, 28],
            realEstateAffordableHousingRate: 1.0,
            realEstateCommercialRate: 5.0,
            constructionMaterialRate: 18.0,
            einvoiceMandatoryTurnoverCr: 5.0
          }),
          desc: 'Budget 2026 Indian GST Statutory Rate Framework'
        },
        {
          code: 'TDS-SECTIONS-2026',
          category: 'TDS_THRESHOLD',
          from: '2026-04-01',
          payload: JSON.stringify({
            sections: {
              '194C': { name: 'Contractors', rateInd: 1.0, rateCorp: 2.0, singleThreshold: 30000, aggregateThreshold: 100000 },
              '194J': { name: 'Professional & Tech Fees', rate: 10.0, rateTech: 2.0, threshold: 30000 },
              '194Q': { name: 'Purchase of Goods', rate: 0.1, threshold: 5000000 },
              '194H': { name: 'Brokerage & Commission', rate: 2.0, threshold: 15000 },
              '194I': { name: 'Rent on Land/Building', rate: 10.0, threshold: 240000 }
            },
            nonPanHigherRate: 20.0
          }),
          desc: 'Budget 2026 TDS Deduction Thresholds and Rates'
        },
        {
          code: 'MSME-43BH-2026',
          category: 'MSME_COMPLIANCE',
          from: '2024-04-01',
          payload: JSON.stringify({
            withoutAgreementDays: 15,
            withAgreementMaxDays: 45,
            interestCompounding: 'MONTHLY',
            interestRateOverRbiRepo: 3.0
          }),
          desc: 'Section 43B(h) MSME Timely Payment Compliance Window'
        }
      ];

      for (const r of budget2026Rules) {
        await prisma.$executeRaw`
          INSERT INTO tally_statutory_rules (
            tenant_id, rule_code, rule_category, effective_from, rule_payload, description
          ) VALUES (
            ${tenantId}::uuid, ${r.code}, ${r.category}, ${r.from}::date, ${r.payload}::jsonb, ${r.desc}
          )
          ON CONFLICT (tenant_id, rule_code) DO NOTHING;
        `;
      }
    }
  });

  isSchemaEnsured = true;
}
