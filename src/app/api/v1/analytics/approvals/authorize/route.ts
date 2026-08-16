import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id } = body;
    const tenantId = auth.user.tenantId;

    if (!id || typeof id !== "string") {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_ID", message: "A valid request ID is required." },
        meta: null,
      }, { status: 400 });
    }

    const reviewerName = auth.user.fullName || auth.user.email || "Governance Director";

    const affected = await prisma.$executeRaw`
      UPDATE capital_allocation_requests
      SET 
        status = 'APPROVED',
        reviewed_by = ${reviewerName},
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}::uuid 
        AND tenant_id = ${tenantId}::uuid
        AND status = 'PENDING_BOARD_APPROVAL'
    `;

    if (affected === 0) {
      return NextResponse.json({
        success: false,
        status_code: 409,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "STATE_CONFLICT",
          message: "The capital allocation request could not be found or has already been reviewed.",
        },
        meta: null,
      }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id, status: "APPROVED" },
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
        code: "AUTHORIZE_CAPITAL_ERROR",
        message: safeErrorMessage(err, "Board capital allocation could not be authorized"),
      },
      meta: null,
    }, { status: 500 });
  }
}
