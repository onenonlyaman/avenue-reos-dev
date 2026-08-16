import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureLandParcelsTable } from "@/lib/legalDb";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage, forbidden } from "@/lib/apiAccess";

const AUTHORIZED_COMMITTEE_ROLES = new Set([
  "Governance Director",
  "Legal Lead",
  "Super Admin",
  "SUPER_ADMIN",
]);

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  if (!AUTHORIZED_COMMITTEE_ROLES.has(auth.user.role)) {
    return forbidden("This action requires Legal Committee or Governance Director authority.");
  }

  const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

  try {
    const body = await request.json();
    const { id, reason } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_ID", message: "A valid parcel ID is required." },
        meta: null,
      }, { status: 400 });
    }

    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (!trimmedReason) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "REJECTION_REASON_REQUIRED", message: "A formal legal reason is required to reject a land acquisition proposal." },
        meta: null,
      }, { status: 400 });
    }

    await ensureLandParcelsTable();

    const reviewerName = auth.user.fullName || auth.user.email || "Legal Committee Authorizer";

    const rowsUpdated = await prisma.$executeRaw`
      UPDATE land_parcels
      SET acquisition_phase = 'REJECTED',
          rejection_reason = ${trimmedReason},
          approved_by = ${reviewerName},
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = ${id}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND acquisition_phase = 'FEASIBILITY'
    `;

    if (rowsUpdated === 0) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "PARCEL_NOT_FOUND_OR_PROCESSED",
          message: "Land parcel was not found or has already been reviewed.",
        },
        meta: null,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id, status: "REJECTED", rejectionReason: trimmedReason, reviewedBy: reviewerName },
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
        code: "REJECT_PARCEL_ERROR",
        message: safeErrorMessage(err, "Land parcel acquisition could not be rejected"),
      },
      meta: null,
    }, { status: 500 });
  }
}
