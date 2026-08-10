import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

async function ensureFacilityAssetRegister() {
  await runtimeDdl("table:facility_assets", () => prisma.$executeRaw`
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
    )
  `);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const model = (prisma as any).facilityAsset;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        orderBy: { assetDescription: "asc" },
      });
    } else {
      try {
        await ensureFacilityAssetRegister();
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM facility_assets WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY asset_description ASC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      assetDescription: r.assetDescription || r.asset_description || "",
      locationName: r.locationName || r.location_name || "",
      category: r.category || "",
      amcProviderName: r.amcProviderName || r.amc_provider_name || "",
      warrantyExpiryDate: r.warrantyExpiryDate ? new Date(r.warrantyExpiryDate).toISOString().split("T")[0] : "",
      lastServiceDate: r.lastServiceDate ? new Date(r.lastServiceDate).toISOString().split("T")[0] : "",
      operatingStatus: r.operatingStatus || r.operating_status || "OPERATIONAL",
      maintenanceCost: Number(r.maintenanceCost ?? r.maintenance_cost ?? 0),
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
        code: "ASSETS_FETCH_ERROR",
        message: safeErrorMessage(err, "Facility asset register is temporarily unavailable"),
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
    const {
      assetDescription,
      locationName,
      category,
      amcProviderName,
      warrantyExpiryDate,
      lastServiceDate,
      operatingStatus,
      maintenanceCost,
    } = body;

    if (!assetDescription || !locationName || !category) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_ASSET_RECORD",
          message: "Asset description, property location and category are required",
        },
        meta: null,
      }, { status: 400 });
    }

    await ensureFacilityAssetRegister();

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO facility_assets (
        tenant_id, asset_description, location_name, category, amc_provider_name,
        warranty_expiry_date, last_service_date, operating_status, maintenance_cost
      ) VALUES (
        ${ACTIVE_TENANT_ID}::uuid, ${assetDescription}, ${locationName}, ${category}, ${amcProviderName || null},
        ${warrantyExpiryDate ? new Date(warrantyExpiryDate) : null}, ${lastServiceDate ? new Date(lastServiceDate) : null},
        ${operatingStatus || "OPERATIONAL"}, ${Number(maintenanceCost) || 0}
      )
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
        assetDescription: created.asset_description,
        locationName: created.location_name,
        category: created.category,
        amcProviderName: created.amc_provider_name || "",
        operatingStatus: created.operating_status,
        maintenanceCost: Number(created.maintenance_cost),
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
        code: "ASSET_CREATE_ERROR",
        message: safeErrorMessage(err, "Facility asset could not be registered"),
      },
      meta: null,
    }, { status: 500 });
  }
}



