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

    if (!id) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_ID", message: "Request ID is required" },
        meta: null,
      }, { status: 400 });
    }

    const model = (prisma as any).securityOverrideRequest;
    if (model?.updateMany) {
      await model.updateMany({
        where: { id, tenantId: ACTIVE_TENANT_ID },
        data: { status: "REJECTED" },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE security_override_requests
        SET status = 'REJECTED', updated_at = NOW()
        WHERE id = ${id}::uuid AND tenant_id = ${ACTIVE_TENANT_ID}::uuid
      `;
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
        code: "REJECT_SECURITY_ERROR",
        message: safeErrorMessage(err, "Security override request could not be rejected"),
      },
      meta: null,
    }, { status: 500 });
  }
}

