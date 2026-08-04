import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

async function ensureCatalogRegister() {
  await prisma.$executeRaw`
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
    )
  `;
}

async function distinctValues(sql: string): Promise<string[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ value: string }[]>(sql, ACTIVE_TENANT_ID);
    return (rows || []).map((r) => r.value).filter((v) => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

export async function POST() {
  try {
    await ensureCatalogRegister();

    const sources: { category: string; values: string[] }[] = [
      {
        category: "UNIT_TYPOLOGY",
        values: await distinctValues(
          "SELECT DISTINCT typology AS value FROM master_unit WHERE tenant_id = $1::uuid AND typology IS NOT NULL"
        ),
      },
      {
        category: "FACING_DIRECTION",
        values: await distinctValues(
          "SELECT DISTINCT facing_direction AS value FROM master_unit WHERE tenant_id = $1::uuid AND facing_direction IS NOT NULL"
        ),
      },
      {
        category: "PARKING_TYPE",
        values: await distinctValues(
          "SELECT DISTINCT parking_bays AS value FROM master_unit WHERE tenant_id = $1::uuid AND parking_bays IS NOT NULL"
        ),
      },
      {
        category: "DEPARTMENT",
        values: await distinctValues(
          "SELECT DISTINCT department AS value FROM hr_employees WHERE tenant_id = $1::uuid"
        ),
      },
      {
        category: "SITE_LOCATION",
        values: await distinctValues(
          "SELECT DISTINCT site_location AS value FROM hr_employees WHERE tenant_id = $1::uuid"
        ),
      },
      {
        category: "WORKFORCE_TYPE",
        values: await distinctValues(
          "SELECT DISTINCT workforce_type AS value FROM hr_employees WHERE tenant_id = $1::uuid"
        ),
      },
      {
        category: "LEAD_SOURCE",
        values: await distinctValues(
          "SELECT DISTINCT lead_source AS value FROM crm_leads WHERE tenant_id = $1::uuid"
        ),
      },
      {
        category: "MATERIAL_CATEGORY",
        values: await distinctValues(
          "SELECT DISTINCT category AS value FROM warehouse_inventory WHERE tenant_id = $1::uuid"
        ),
      },
      {
        category: "ASSET_CATEGORY",
        values: await distinctValues(
          "SELECT DISTINCT category AS value FROM facility_assets WHERE tenant_id = $1::uuid"
        ),
      },
      {
        category: "TICKET_CATEGORY",
        values: await distinctValues(
          "SELECT DISTINCT category AS value FROM maintenance_tickets WHERE tenant_id = $1::uuid"
        ),
      },
    ];

    let importedCount = 0;

    for (const source of sources) {
      for (const value of source.values) {
        await prisma.$executeRaw`
          INSERT INTO master_catalog_options (tenant_id, category, option_value)
          VALUES (${ACTIVE_TENANT_ID}::uuid, ${source.category}, ${value})
          ON CONFLICT (tenant_id, category, option_value) DO NOTHING
        `;
        importedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { importedCount },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "CATALOG_SYNC_ERROR",
        message: err instanceof Error ? err.message : "Reference lists could not be imported from existing records",
      },
      meta: null,
    });
  }
}
