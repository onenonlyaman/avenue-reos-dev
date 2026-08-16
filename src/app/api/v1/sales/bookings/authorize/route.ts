import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { bookingId, id } = body;
  const targetId = bookingId || id;

  try {
    if (!targetId) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_ID", message: "bookingId is required" },
      }, { status: 400 });
    }

    const booking = await prisma.salesBooking.findFirst({
      where: { id: targetId, tenantId: auth.user.tenantId },
    });

    if (!booking) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "BOOKING_NOT_FOUND", message: "Booking record not found" },
      }, { status: 404 });
    }

    const approverEmployee = await prisma.masterEmployee.findFirst({
      where: { tenantId: auth.user.tenantId, email: auth.user.email, status: "ACTIVE" },
    });

    await prisma.$transaction([
      prisma.salesBooking.update({
        where: { id: targetId },
        data: {
          status: "APPROVED",
          ...(approverEmployee ? { approvedById: approverEmployee.id } : {}),
        },
      }),
      prisma.masterUnit.update({
        where: { id: booking.unitId },
        data: { status: "BOOKED" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: targetId,
        status: "APPROVED",
        unitStatus: "BOOKED",
      },
      error: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "APPROVE_BOOKING_ERROR",
        message: safeErrorMessage(err, "Booking could not be authorized"),
      },
    }, { status: 500 });
  }
}
