import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export const CATALOG_CATEGORIES = [
  "DEPARTMENT",
  "UNIT_TYPOLOGY",
  "FACING_DIRECTION",
  "PARKING_TYPE",
  "WORKFORCE_TYPE",
  "SITE_LOCATION",
  "TICKET_CATEGORY",
  "ASSET_CATEGORY",
  "MATERIAL_CATEGORY",
  "LEAD_SOURCE",
] as const;

async function ensureCatalogRegister() {
  await runtimeDdl("table:master_catalog_options", () => prisma.$executeRaw`
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
  `);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureCatalogRegister();

    const category = request.nextUrl.searchParams.get("category");

    const rows = category
      ? await prisma.$queryRaw<any[]>`
          SELECT * FROM master_catalog_options
          WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND status = 'ACTIVE' AND category = ${category}
          ORDER BY sort_order ASC, option_value ASC
        `
      : await prisma.$queryRaw<any[]>`
          SELECT * FROM master_catalog_options
          WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND status = 'ACTIVE'
          ORDER BY category ASC, sort_order ASC, option_value ASC
        `;

    const mapped = (rows || []).map((r: any) => ({
      id: r.id,
      category: r.category,
      optionValue: r.option_value,
      sortOrder: Number(r.sort_order),
    }));

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: { total_records: mapped.length },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: [],
      error: {
        code: "CATALOG_FETCH_ERROR",
        message: safeErrorMessage(err, "Reference list could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { category, optionValue, sortOrder } = body;

    if (!category || !optionValue) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_CATALOG_ENTRY",
          message: "A list name and entry value are required",
        },
        meta: null,
      }, { status: 400 });
    }

    if (!CATALOG_CATEGORIES.includes(category)) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "UNKNOWN_CATALOG_CATEGORY",
          message: "That reference list is not recognised",
        },
        meta: null,
      }, { status: 400 });
    }

    await ensureCatalogRegister();

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO master_catalog_options (tenant_id, category, option_value, sort_order)
      VALUES (${ACTIVE_TENANT_ID}::uuid, ${category}, ${optionValue}, ${Number(sortOrder) || 0})
      ON CONFLICT (tenant_id, category, option_value)
      DO UPDATE SET status = 'ACTIVE', sort_order = ${Number(sortOrder) || 0}, updated_at = NOW()
      RETURNING *
    `;

    const created = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        category: created.category,
        optionValue: created.option_value,
        sortOrder: Number(created.sort_order),
      },
      error: null,
      meta: null,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "CATALOG_CREATE_ERROR",
        message: safeErrorMessage(err, "Reference entry could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_CATALOG_ID", message: "An entry must be selected for removal" },
        meta: null,
      }, { status: 400 });
    }

    await ensureCatalogRegister();

    await prisma.$executeRaw`
      UPDATE master_catalog_options
      SET status = 'RETIRED', updated_at = NOW()
      WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND id = ${id}::uuid
    `;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { id },
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
        code: "CATALOG_DELETE_ERROR",
        message: safeErrorMessage(err, "Reference entry could not be retired"),
      },
      meta: null,
    }, { status: 500 });
  }
}
