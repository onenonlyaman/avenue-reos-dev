import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { envelope, requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

  try {
    const [
      pendingBookingsCount,
      pendingGlCount,
      constructionPendingCount,
      procurementPendingCount,
      facilityPendingCount,
      legalPendingResult,
      boardPendingCount,
    ] = await Promise.all([
      // Finance: Pending sales bookings
      prisma.salesBooking.count({
        where: { tenantId, status: "PENDING_APPROVAL" },
      }),
      // Finance: High value GL vouchers > ₹40 Lakhs
      prisma.generalLedgerEntry.count({
        where: { tenantId, debitAmount: { gt: 4000000 } },
      }),
      // Construction: Contractor RA Bills pending approval
      prisma.contractorRaBill.count({
        where: { tenantId, status: "PENDING_APPROVAL" },
      }),
      // Procurement: Purchase orders requiring HITL approval
      prisma.purchaseOrder.count({
        where: { tenantId, requiresHitl: true, status: "PENDING_APPROVAL" },
      }),
      // Facility: Unit handovers requiring HITL approval
      prisma.unitHandover.count({
        where: { tenantId, requiresHitl: true, status: "PENDING_APPROVAL" },
      }),
      // Legal: Land acquisitions requiring HITL in Feasibility phase
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count 
        FROM land_parcels 
        WHERE tenant_id = ${tenantId}::uuid 
          AND requires_hitl = true 
          AND acquisition_phase = 'FEASIBILITY'
      `.catch(() => [{ count: 0 }]),
      // Board / Executive Analytics: Capital allocations requiring board approval
      prisma.capitalAllocationRequest.count({
        where: { tenantId, requiresHitl: true, status: "PENDING_BOARD_APPROVAL" },
      }),
    ]);

    const financePendingCount = pendingBookingsCount + pendingGlCount;
    const legalPendingCount = Number(legalPendingResult[0]?.count ?? 0);

    const totalPendingHitl =
      financePendingCount +
      constructionPendingCount +
      procurementPendingCount +
      facilityPendingCount +
      legalPendingCount +
      boardPendingCount;

    return envelope(200, {
      data: {
        financePendingCount,
        constructionPendingCount,
        procurementPendingCount,
        facilityPendingCount,
        legalPendingCount,
        boardPendingCount,
        totalPendingHitl,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    return envelope(500, {
      error: {
        code: "HITL_SUMMARY_ERROR",
        message: safeErrorMessage(err, "Human-in-the-loop governance summary could not be retrieved"),
      },
    });
  }
}
