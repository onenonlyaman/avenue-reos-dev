import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { bookingId, id, notes } = body;
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
      });
    }

    const booking = await prisma.salesBooking.findUnique({
      where: { id: targetId },
    });

    if (!booking) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "BOOKING_NOT_FOUND", message: "Booking record not found" },
      });
    }

    await prisma.$transaction([
      prisma.salesBooking.update({
        where: { id: targetId },
        data: {
          status: "REJECTED",
          paymentPlanJson: {
            ...((booking.paymentPlanJson as Record<string, unknown>) || {}),
            rejection_notes: notes || "Booking request rejected by Sales Director.",
          },
        },
      }),
      prisma.masterUnit.update({
        where: { id: booking.unitId },
        data: { status: "AVAILABLE" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: targetId,
        status: "REJECTED",
        unitStatus: "AVAILABLE",
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
        code: "REJECT_BOOKING_ERROR",
        message: err instanceof Error ? err.message : "Booking could not be rejected",
      },
    });
  }
}
