import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
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
        error: { code: "INVALID_ID", message: "Parcel ID is required" },
        meta: null,
      });
    }

    const model = (prisma as any).landParcel;
    if (model?.update) {
      await model.update({
        where: { id },
        data: { acquisitionPhase: "DUE_DILIGENCE" },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE land_parcels
        SET acquisition_phase = 'DUE_DILIGENCE', updated_at = NOW()
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
        code: "AUTHORIZE_PARCEL_ERROR",
        message: err instanceof Error ? err.message : "Land parcel acquisition could not be authorized",
      },
      meta: null,
    });
  }
}
