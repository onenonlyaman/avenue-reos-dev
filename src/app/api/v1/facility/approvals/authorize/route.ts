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
        error: { code: "INVALID_ID", message: "Handover ID is required" },
        meta: null,
      });
    }

    const model = (prisma as any).unitHandover;
    if (model?.update) {
      await model.update({
        where: { id },
        data: { status: "READY_FOR_HANDOVER" },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE unit_handovers
        SET status = 'READY_FOR_HANDOVER', updated_at = NOW()
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
        code: "AUTHORIZE_HANDOVER_ERROR",
        message: err instanceof Error ? err.message : "Handover could not be authorized",
      },
      meta: null,
    });
  }
}
