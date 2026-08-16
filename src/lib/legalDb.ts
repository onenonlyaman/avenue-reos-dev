import { prisma, runtimeDdl } from "@/lib/db";

export async function ensureLandParcelsTable(): Promise<void> {
  await runtimeDdl("table:land_parcels:v2", async () => {
    await prisma.$executeRaw`
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
        rejection_reason TEXT,
        approved_by VARCHAR(255),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `;
    await prisma.$executeRaw`
      ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255)
    `;
    await prisma.$executeRaw`
      ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_land_parcels_ref ON land_parcels (tenant_id, parcel_reference)
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_land_parcels_tenant_phase ON land_parcels (tenant_id, acquisition_phase)
    `;
  });
}

export async function ensureJdaContractsTable(): Promise<void> {
  await runtimeDdl("table:jda_contracts:v2", async () => {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS jda_contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        agreement_reference VARCHAR(100) NOT NULL,
        landowner_name VARCHAR(255) NOT NULL,
        project_site VARCHAR(255) NOT NULL,
        developer_share_pct DECIMAL(5,2) NOT NULL,
        landowner_share_pct DECIMAL(5,2) NOT NULL,
        escrow_account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        contract_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      ALTER TABLE jda_contracts ADD COLUMN IF NOT EXISTS escrow_account_status VARCHAR(50) DEFAULT 'ACTIVE'
    `;
    await prisma.$executeRaw`
      ALTER TABLE jda_contracts ADD COLUMN IF NOT EXISTS contract_status VARCHAR(50) DEFAULT 'ACTIVE'
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_jda_contracts_ref ON jda_contracts (tenant_id, agreement_reference)
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_jda_contracts_tenant ON jda_contracts (tenant_id)
    `;
  });
}

export async function ensureReraComplianceRegister(): Promise<void> {
  await runtimeDdl("table:rera_compliances:v2", async () => {
    await prisma.$executeRaw`
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
      )
    `;
    await prisma.$executeRaw`
      ALTER TABLE rera_compliances ADD COLUMN IF NOT EXISTS quarterly_return_status VARCHAR(50) DEFAULT 'COMPLIANT'
    `;
    await prisma.$executeRaw`
      ALTER TABLE rera_compliances ADD COLUMN IF NOT EXISTS escrow_balance_amount NUMERIC(15,2) DEFAULT 0
    `;
    await prisma.$executeRaw`
      ALTER TABLE rera_compliances ADD COLUMN IF NOT EXISTS form1_status BOOLEAN DEFAULT false
    `;
    await prisma.$executeRaw`
      ALTER TABLE rera_compliances ADD COLUMN IF NOT EXISTS form2_status BOOLEAN DEFAULT false
    `;
    await prisma.$executeRaw`
      ALTER TABLE rera_compliances ADD COLUMN IF NOT EXISTS form3_status BOOLEAN DEFAULT false
    `;
    await prisma.$executeRaw`
      ALTER TABLE rera_compliances ADD COLUMN IF NOT EXISTS certificate_audit_status VARCHAR(100) DEFAULT 'Compliant'
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_rera_compliances_ref ON rera_compliances (tenant_id, rera_reg_reference)
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_rera_compliances_tenant ON rera_compliances (tenant_id)
    `;
  });
}

export async function ensureTitleSearchRegister(): Promise<void> {
  await runtimeDdl("table:title_search_logs:v2", async () => {
    await prisma.$executeRaw`
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
      )
    `;
    await prisma.$executeRaw`
      ALTER TABLE title_search_logs ADD COLUMN IF NOT EXISTS search_period_years INTEGER DEFAULT 30
    `;
    await prisma.$executeRaw`
      ALTER TABLE title_search_logs ADD COLUMN IF NOT EXISTS encumbrance_status VARCHAR(100) DEFAULT 'Clear'
    `;
    await prisma.$executeRaw`
      ALTER TABLE title_search_logs ADD COLUMN IF NOT EXISTS extract_verified_712 BOOLEAN DEFAULT false
    `;
    await prisma.$executeRaw`
      ALTER TABLE title_search_logs ADD COLUMN IF NOT EXISTS risk_rating VARCHAR(50) DEFAULT 'LOW'
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_title_search_tenant_survey ON title_search_logs (tenant_id, survey_number)
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_title_search_tenant ON title_search_logs (tenant_id)
    `;
  });
}
