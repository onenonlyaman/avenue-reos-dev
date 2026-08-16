import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id, reason } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          status_code: 400,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: { code: "INVALID_ID", message: "Handover identifier is required" },
          meta: null,
        },
        { status: 400 }
      );
    }

    const rejectionReason = typeof reason === "string" && reason.trim() ? reason.trim() : "Handover rejected by Operations Director";

    const result = await prisma.unitHandover.updateMany({
      where: {
        id,
        tenantId: ACTIVE_TENANT_ID,
        status: "PENDING_APPROVAL",
      },
      data: {
        status: "IN_DESNAGGING",
        rejectionReason,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          success: false,
          status_code: 404,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: {
            code: "HANDOVER_NOT_FOUND",
            message: "No pending handover approval found for the specified unit.",
          },
          meta: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id, status: "IN_DESNAGGING", rejectionReason },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "REJECT_HANDOVER_ERROR",
          message: safeErrorMessage(err, "Handover request could not be rejected"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
