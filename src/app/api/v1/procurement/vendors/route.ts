import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const vendors = await prisma.masterVendor.findMany({ where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { companyName: "asc" },
    });

    const mapped = vendors.map((v) => ({
      id: v.id,
      companyName: v.companyName,
      specialty: v.vendorCategory,
      gstinReference: v.taxNumber || "",
      performanceRating: Number((Number(v.rating || 0) * 20).toFixed(0)),
      activeOrderCount: 0,
      status: (v.status === "ACTIVE" ? "ACTIVE" : "PENDING_REVIEW") as "ACTIVE" | "PENDING_REVIEW" | "SUSPENDED",
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
        code: "VENDORS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Approved vendors could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendorCode, companyName, contactPerson, email, phone, vendorCategory, taxNumber, rating } = body;

    if (!companyName || !vendorCategory) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_VENDOR_RECORD",
          message: "Vendor name and material category are required",
        },
        meta: null,
      });
    }

    const created = await prisma.masterVendor.create({
      data: {
        tenantId: ACTIVE_TENANT_ID,
        vendorCode: vendorCode || `VEN-${Date.now().toString().slice(-6)}`,
        companyName,
        contactPerson: contactPerson || "",
        email: email || "",
        phone: phone || "",
        vendorCategory,
        taxNumber: taxNumber || null,
        rating: Number(rating) || 0,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        companyName: created.companyName,
        specialty: created.vendorCategory,
        gstinReference: created.taxNumber || "",
        performanceRating: Number((Number(created.rating || 0) * 20).toFixed(0)),
        activeOrderCount: 0,
        status: created.status,
      },
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
        code: "VENDOR_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Vendor record could not be saved",
      },
      meta: null,
    });
  }
}
