import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const records = await prisma.facilityAsset.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { assetDescription: "asc" },
    });

    const mapped = records.map((r) => ({
      id: r.id,
      assetDescription: r.assetDescription,
      locationName: r.locationName,
      category: r.category,
      amcProviderName: r.amcProviderName || "",
      warrantyExpiryDate: r.warrantyExpiryDate ? new Date(r.warrantyExpiryDate).toISOString().split("T")[0] : "",
      lastServiceDate: r.lastServiceDate ? new Date(r.lastServiceDate).toISOString().split("T")[0] : "",
      operatingStatus: r.operatingStatus,
      maintenanceCost: Number(r.maintenanceCost),
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
    return NextResponse.json(
      {
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
      },
      { status: 500 }
    );
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
      return NextResponse.json(
        {
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
        },
        { status: 400 }
      );
    }

    const created = await prisma.facilityAsset.create({
      data: {
        tenantId: ACTIVE_TENANT_ID,
        assetDescription: String(assetDescription).trim(),
        locationName: String(locationName).trim(),
        category: String(category).trim(),
        amcProviderName: amcProviderName ? String(amcProviderName).trim() : null,
        warrantyExpiryDate: warrantyExpiryDate ? new Date(warrantyExpiryDate) : null,
        lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : null,
        operatingStatus: operatingStatus || "OPERATIONAL",
        maintenanceCost: Number(maintenanceCost) || 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        status_code: 201,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          id: created.id,
          assetDescription: created.assetDescription,
          locationName: created.locationName,
          category: created.category,
          amcProviderName: created.amcProviderName || "",
          warrantyExpiryDate: created.warrantyExpiryDate ? new Date(created.warrantyExpiryDate).toISOString().split("T")[0] : "",
          lastServiceDate: created.lastServiceDate ? new Date(created.lastServiceDate).toISOString().split("T")[0] : "",
          operatingStatus: created.operatingStatus,
          maintenanceCost: Number(created.maintenanceCost),
        },
        error: null,
        meta: null,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
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
      },
      { status: 500 }
    );
  }
}
