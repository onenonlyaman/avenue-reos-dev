import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id, reason } = body;
    const tenantId = auth.user.tenantId;

    if (!id) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_ID", message: "Purchase order ID is required." },
        meta: null,
      }, { status: 400 });
    }

    const rejectionReasonText = reason?.trim() || "Rejected during director governance audit review.";
    const poModel = (prisma as any).purchaseOrder;
    let updatedCount = 0;

    if (poModel?.updateMany) {
      const result = await poModel.updateMany({
        where: { id, tenantId, status: "PENDING_APPROVAL" },
        data: { status: "REJECTED", rejectionReason: rejectionReasonText },
      });
      updatedCount = result.count;
    } else {
      updatedCount = await prisma.$executeRaw`
        UPDATE purchase_orders
        SET status = 'REJECTED', rejection_reason = ${rejectionReasonText}, updated_at = NOW()
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND status = 'PENDING_APPROVAL'
      `;
    }

    if (updatedCount === 0) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "ORDER_NOT_FOUND_OR_PROCESSED",
          message: "Purchase order was not found in pending approval queue or has already been processed.",
        },
        meta: null,
      }, { status: 404 });
    }

    // Log governance audit entry
    try {
      await prisma.$executeRaw`
        INSERT INTO platform_audit_entries (
          id, tenant_id, source, dst, protocol, module, submodule, error_status_code, size_bytes, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${tenantId}::uuid, ${auth.user.email || "director"}, 'PO-REJECT', 'INTERNAL_API', 'PROCUREMENT', 'DIRECTOR_REJECTION', 200, 0, NOW(), NOW()
        );
      `;
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id, status: "REJECTED" },
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
        code: "REJECT_PO_ERROR",
        message: safeErrorMessage(err, "Purchase order could not be rejected"),
      },
      meta: null,
    }, { status: 500 });
  }
}
