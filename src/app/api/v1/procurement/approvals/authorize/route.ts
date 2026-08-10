import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_ID", message: "Purchase order ID is required" },
        meta: null,
      }, { status: 400 });
    }

    const poModel = (prisma as any).purchaseOrder;
    if (poModel?.update) {
      await poModel.update({
        where: { id },
        data: { status: "APPROVED" },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE purchase_orders
        SET status = 'APPROVED', updated_at = NOW()
        WHERE id = ${id}::uuid
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
        code: "AUTHORIZE_PO_ERROR",
        message: safeErrorMessage(err, "Purchase order could not be authorized"),
      },
      meta: null,
    }, { status: 500 });
  }
}
