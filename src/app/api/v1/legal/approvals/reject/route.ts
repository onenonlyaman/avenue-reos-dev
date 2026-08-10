import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
        error: { code: "INVALID_ID", message: "Parcel ID is required" },
        meta: null,
      }, { status: 400 });
    }

    const model = (prisma as any).landParcel;
    if (model?.update) {
      await model.update({
        where: { id },
        data: { acquisitionPhase: "REJECTED" },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE land_parcels
        SET acquisition_phase = 'REJECTED', updated_at = NOW()
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
        code: "REJECT_PARCEL_ERROR",
        message: safeErrorMessage(err, "Land parcel acquisition could not be rejected"),
      },
      meta: null,
    }, { status: 500 });
  }
}
