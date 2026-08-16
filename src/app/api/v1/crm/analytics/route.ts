import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;

    const [leads, bookings, units, projects] = await Promise.all([
      prisma.crmLead.findMany({
        where: { tenantId },
        select: {
          id: true,
          status: true,
          budgetMin: true,
          budgetMax: true,
        },
      }),
      prisma.salesBooking.findMany({
        where: { tenantId },
        include: {
          unit: true,
          salesRep: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
      }),
      prisma.masterUnit.findMany({
        where: { tenantId },
        select: {
          id: true,
          status: true,
          basePrice: true,
        },
      }),
      prisma.masterProject.findMany({
        where: { tenantId },
        include: {
          units: {
            select: {
              id: true,
              status: true,
              basePrice: true,
            },
          },
        },
      }),
    ]);

    const leadsCount = leads.length;
    const qualifiedLeads = leads.filter((l) => l.status === "QUALIFIED");
    const siteVisitLeads = leads.filter((l) => l.status === "SITE_VISIT_SCHEDULED");

    const totalLeadsPipelineAmt = leads.reduce((acc, l) => acc + Number(l.budgetMax || l.budgetMin || 0), 0);
    const qualifiedPipelineAmt = qualifiedLeads.reduce((acc, l) => acc + Number(l.budgetMax || l.budgetMin || 0), 0);
    const siteVisitPipelineAmt = siteVisitLeads.reduce((acc, l) => acc + Number(l.budgetMax || l.budgetMin || 0), 0);

    let totalRealizedRev = 0;
    bookings.forEach((b) => {
      totalRealizedRev += Number(b.agreedTotalPrice || 0);
    });

    const confirmedBookings = bookings.filter(
      (b) => b.status === "APPROVED" || b.status === "POSSESSION_HANDED_OVER"
    );
    const pendingHitlBookings = bookings.filter((b) => b.status === "PENDING_APPROVAL");

    const confirmedRev = confirmedBookings.reduce((a, c) => a + Number(c.agreedTotalPrice || 0), 0);
    const pendingRev = pendingHitlBookings.reduce((a, c) => a + Number(c.agreedTotalPrice || 0), 0);

    const funnelStages = [
      {
        stage: "Initial Inquiries",
        count: leadsCount,
        valueLakhs: Number((totalLeadsPipelineAmt / 100000).toFixed(1)),
        conversion: leadsCount > 0 ? "100%" : "0%",
      },
      {
        stage: "Qualified Prospect Records",
        count: qualifiedLeads.length,
        valueLakhs: Number((qualifiedPipelineAmt / 100000).toFixed(1)),
        conversion: leadsCount > 0 ? `${((qualifiedLeads.length / leadsCount) * 100).toFixed(1)}%` : "0%",
      },
      {
        stage: "Site Visits Conducted",
        count: siteVisitLeads.length,
        valueLakhs: Number((siteVisitPipelineAmt / 100000).toFixed(1)),
        conversion: leadsCount > 0 ? `${((siteVisitLeads.length / leadsCount) * 100).toFixed(1)}%` : "0%",
      },
      {
        stage: "Commercial Quotes Issued",
        count: bookings.length,
        valueLakhs: Number((totalRealizedRev / 100000).toFixed(1)),
        conversion: leadsCount > 0 ? `${((bookings.length / leadsCount) * 100).toFixed(1)}%` : "0%",
      },
      {
        stage: "Executive HITL Approvals",
        count: pendingHitlBookings.length,
        valueLakhs: Number((pendingRev / 100000).toFixed(1)),
        conversion: bookings.length > 0 ? `${((pendingHitlBookings.length / bookings.length) * 100).toFixed(1)}%` : "0%",
      },
      {
        stage: "Confirmed Unit Bookings",
        count: confirmedBookings.length,
        valueLakhs: Number((confirmedRev / 100000).toFixed(1)),
        conversion: bookings.length > 0 ? `${((confirmedBookings.length / bookings.length) * 100).toFixed(1)}%` : "0%",
      },
    ];

    const projectPerformance = projects.map((p) => {
      const totalU = p.units.length;
      const bookedU = p.units.filter((u) => u.status === "BOOKED" || u.status === "RESERVED").length;
      const occ = totalU > 0 ? ((bookedU / totalU) * 100).toFixed(1) : "0.0";
      const totalRev = p.units
        .filter((u) => u.status === "BOOKED" || u.status === "RESERVED")
        .reduce((acc, u) => acc + Number(u.basePrice || 0), 0);

      return {
        name: p.projectName,
        totalUnits: totalU,
        bookedUnits: bookedU,
        occupancy: `${occ}%`,
        realizedRevenueCr: `₹${(totalRev / 10000000).toFixed(2)} Cr`,
        targetRevenueCr: `₹${(Number(p.totalBudget || 0) / 10000000).toFixed(2)} Cr`,
      };
    });

    const repMap = new Map<string, { name: string; role: string; revenue: number; unitsCount: number }>();
    bookings.forEach((b) => {
      const repName = b.salesRep?.fullName || "Unassigned";
      const repRole = b.salesRep?.role || "Sales Representative";
      const existing = repMap.get(repName) || { name: repName, role: repRole, revenue: 0, unitsCount: 0 };
      existing.revenue += Number(b.agreedTotalPrice || 0);
      existing.unitsCount += 1;
      repMap.set(repName, existing);
    });

    const salesRepRealization = Array.from(repMap.values()).map((r) => ({
      name: r.name,
      role: r.role,
      realizedRevenueCr: Number((r.revenue / 10000000).toFixed(2)),
      bookedUnitsCount: r.unitsCount,
    }));

    const bookedCount = units.filter((u) => u.status === "BOOKED" || u.status === "RESERVED").length;
    const totalUnitsCount = units.length;
    const velocityPct = totalUnitsCount > 0 ? Number(((bookedCount / totalUnitsCount) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        quarterlyPipelineRealizationCr: Number((totalRealizedRev / 10000000).toFixed(2)),
        activeProspectCount: leadsCount,
        averageUnitRealizationCr: bookings.length > 0 ? Number((totalRealizedRev / bookings.length / 10000000).toFixed(2)) : 0,
        inventoryVelocityPct: velocityPct,
        totalUnitsCount,
        bookedUnitsCount: bookedCount,
        funnelStages,
        projectPerformance,
        salesRepRealization,
      },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        quarterlyPipelineRealizationCr: 0,
        activeProspectCount: 0,
        averageUnitRealizationCr: 0,
        inventoryVelocityPct: 0,
        totalUnitsCount: 0,
        bookedUnitsCount: 0,
        funnelStages: [],
        projectPerformance: [],
        salesRepRealization: [],
      },
      error: {
        code: "ANALYTICS_ERROR",
        message: safeErrorMessage(err, "CRM analytics could not be completed"),
      },
      meta: null,
    }, { status: 500 });
  }
}
