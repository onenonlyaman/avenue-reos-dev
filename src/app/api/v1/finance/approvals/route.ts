import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const pendingBookings = await prisma.salesBooking.findMany({
      where: { tenantId: ACTIVE_TENANT_ID, status: "PENDING_APPROVAL" },
      include: {
        customer: true,
        unit: {
          include: {
            project: true,
          },
        },
        salesRep: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const pendingGl = await prisma.generalLedgerEntry.findMany({
      where: { tenantId: ACTIVE_TENANT_ID, debitAmount: { gt: 4000000 } },
      include: {
        costCenter: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const approvals = [
      ...pendingBookings.map((b) => ({
        id: b.id,
        requestNumber: b.bookingCode,
        vendorOrRecipient: b.customer?.fullName || "Prospect Record",
        costCenter: b.unit?.towerName || "Sales Unit Head",
        projectName: b.unit?.project?.projectName || "",
        amountLakhs: Number((Number(b.agreedTotalPrice) / 100000).toFixed(2)),
        requestedBy: b.salesRep?.fullName || "Sales Manager",
        authorizingOfficer: "Executive CFO",
        requestDate: b.createdAt.toISOString().replace("T", " ").substring(0, 16),
        reason: "High-Value Vendor PO" as const,
        documentRef: `DOC-BOOKING-${b.bookingCode}`,
        requiresHitl: true,
      })),
      ...pendingGl.map((gl) => ({
        id: gl.id,
        requestNumber: gl.voucherNumber,
        vendorOrRecipient: gl.narration.split("—")[0] || "GL Vendor/Recipient",
        costCenter: gl.costCenter?.name || "Corporate GL Head",
        projectName: gl.costCenter?.project?.projectName || "Avenue Horizon",
        amountLakhs: Number((Number(gl.debitAmount) / 100000).toFixed(2)),
        requestedBy: "Finance Officer",
        authorizingOfficer: "Executive CFO",
        requestDate: gl.createdAt.toISOString().replace("T", " ").substring(0, 16),
        reason: "Manual GL Entry > ₹40L" as const,
        documentRef: gl.sourceReferenceId || `DOC-VOUCHER-${gl.voucherNumber}`,
        requiresHitl: true,
      })),
    ];

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: approvals,
      error: null,
      meta: {
        total_records: approvals.length,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: [],
      error: {
        code: "FETCH_APPROVALS_ERROR",
        message: err instanceof Error ? err.message : "Approvals could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}
