import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
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
        error: { code: "INVALID_ID", message: "A valid bill ID is required" },
        meta: null,
      }, { status: 400 });
    }

    const updated = await prisma.contractorRaBill.updateMany({
      where: {
        id,
        tenantId,
        status: "PENDING_APPROVAL",
      },
      data: {
        status: "APPROVED",
        updatedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      const existing = await prisma.contractorRaBill.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        return NextResponse.json({
          success: false,
          status_code: 404,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: { code: "BILL_NOT_FOUND", message: "Contractor RA bill was not found in your organization." },
          meta: null,
        }, { status: 404 });
      }

      return NextResponse.json({
        success: false,
        status_code: 409,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "ALREADY_PROCESSED", message: `Bill has already been processed with status: ${existing.status}` },
        meta: null,
      }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id },
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
        code: "AUTHORIZE_RA_BILL_ERROR",
        message: safeErrorMessage(err, "RA bill could not be authorized"),
      },
      meta: null,
    }, { status: 500 });
  }
}

