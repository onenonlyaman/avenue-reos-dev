import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;
    const vendors = await prisma.masterVendor.findMany({
      where: { tenantId },
      orderBy: { companyName: "asc" },
    });

    // Query active PO counts per vendor
    let poCountsMap: Record<string, number> = {};
    try {
      const counts = await prisma.$queryRaw<any[]>`
        SELECT vendor_name, COUNT(*)::int as count 
        FROM purchase_orders 
        WHERE tenant_id = ${tenantId}::uuid AND status IN ('PENDING_APPROVAL', 'APPROVED', 'DISPATCHED')
        GROUP BY vendor_name;
      `;
      for (const row of counts || []) {
        if (row.vendor_name) {
          poCountsMap[row.vendor_name.toLowerCase()] = Number(row.count || 0);
        }
      }
    } catch {
      // Table may not have rows yet
      poCountsMap = {};
    }

    const mapped = vendors.map((v) => {
      const ratingNum = Number(v.rating || 0);
      const score = Math.min(100, Math.max(0, Math.round(ratingNum <= 5 ? ratingNum * 20 : ratingNum)));
      const activeCount = poCountsMap[v.companyName.toLowerCase()] || 0;

      return {
        id: v.id,
        companyName: v.companyName,
        specialty: v.vendorCategory,
        gstinReference: v.taxNumber || "",
        performanceRating: score,
        activeOrderCount: activeCount,
        status: (v.status === "ACTIVE" ? "ACTIVE" : v.status === "SUSPENDED" ? "SUSPENDED" : "PENDING_REVIEW") as
          | "ACTIVE"
          | "PENDING_REVIEW"
          | "SUSPENDED",
      };
    });

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
        message: safeErrorMessage(err, "Approved vendors could not be loaded"),
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
    const { vendorCode, companyName, contactPerson, email, phone, vendorCategory, taxNumber, rating } = body;
    const tenantId = auth.user.tenantId;

    if (!companyName || !vendorCategory) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_VENDOR_RECORD",
          message: "Vendor name and material category are required.",
        },
        meta: null,
      }, { status: 400 });
    }

    const code = vendorCode?.trim() || `VEN-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const ratingValue = rating !== undefined && rating !== null ? Number(rating) : 4.5;

    const created = await prisma.masterVendor.create({
      data: {
        tenantId,
        vendorCode: code,
        companyName: companyName.trim(),
        contactPerson: contactPerson?.trim() || "",
        email: email?.trim() || "",
        phone: phone?.trim() || "",
        vendorCategory: vendorCategory.trim(),
        taxNumber: taxNumber?.trim() || null,
        rating: ratingValue,
        status: "ACTIVE",
      },
    });

    const score = Math.min(100, Math.max(0, Math.round(Number(created.rating || 0) <= 5 ? Number(created.rating || 0) * 20 : Number(created.rating || 0))));

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
        performanceRating: score,
        activeOrderCount: 0,
        status: created.status,
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
        code: "VENDOR_CREATE_ERROR",
        message: safeErrorMessage(err, "Vendor record could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}
