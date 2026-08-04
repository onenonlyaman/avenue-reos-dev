import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const dbBookings = await prisma.salesBooking.findMany({
      where: { tenantId: ACTIVE_TENANT_ID, status: "PENDING_APPROVAL" },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        unit: {
          include: {
            project: true,
          },
        },
        salesRep: true,
      },
    });

    const mapped = dbBookings.map((b) => {
      const offeredPrice = Number(b.agreedTotalPrice);
      const discountPct = Number(b.discountPercentage || 0);
      const basePrice = discountPct > 0 ? Math.round(offeredPrice / (1 - discountPct / 100)) : offeredPrice;
      const discountAmount = basePrice - offeredPrice;

      return {
        id: b.id,
        customerName: b.customer?.fullName || "Prospect Record",
        customerPhone: b.customer?.phoneNumber || "",
        projectName: b.unit?.project?.projectName || "",
        unitNumber: b.unit?.unitNumber || "",
        basePriceLakhs: Number((basePrice / 100000).toFixed(2)),
        offeredPriceLakhs: Number((offeredPrice / 100000).toFixed(2)),
        discountPercentage: discountPct,
        discountAmountLakhs: Number((discountAmount / 100000).toFixed(2)),
        salesRepName: b.salesRep?.fullName || "Unassigned",
        salesRepNotes: "VIP prospect requesting executive commercial discount override.",
        submittedDate: b.createdAt.toISOString().split("T")[0],
        reason: "High Discount (>5%)" as const,
      };
    });

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: { total_records: mapped.length },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: [],
      error: {
        code: "FETCH_PENDING_BOOKINGS_ERROR",
        message: err instanceof Error ? err.message : "Pending bookings could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}
