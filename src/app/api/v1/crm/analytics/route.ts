import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const leadsCount = await prisma.crmLead.count({ where: { tenantId: ACTIVE_TENANT_ID } });
    const qualifiedCount = await prisma.crmLead.count({ where: { tenantId: ACTIVE_TENANT_ID, status: "QUALIFIED" } });
    const siteVisitsCount = await prisma.crmLead.count({ where: { tenantId: ACTIVE_TENANT_ID, status: "SITE_VISIT_SCHEDULED" } });
    const bookings = await prisma.salesBooking.findMany({ where: { tenantId: ACTIVE_TENANT_ID }, include: { unit: true, salesRep: true } });
    const units = await prisma.masterUnit.findMany({ where: { tenantId: ACTIVE_TENANT_ID }, include: { project: true } });
    const projects = await prisma.masterProject.findMany({ where: { tenantId: ACTIVE_TENANT_ID }, include: { units: true } });

    let totalRealizedRev = 0;
    bookings.forEach((b) => {
      totalRealizedRev += Number(b.agreedTotalPrice);
    });

    const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "APPROVED");
    const pendingHitlBookings = bookings.filter((b) => b.status === "PENDING_APPROVAL");

    const funnelStages = [
      { stage: "Initial Inquiries", count: leadsCount, valueLakhs: Number((leadsCount * 9.5).toFixed(1)), conversion: "100%" },
      { stage: "Qualified Prospect Records", count: qualifiedCount, valueLakhs: Number((qualifiedCount * 9.5).toFixed(1)), conversion: leadsCount > 0 ? `${((qualifiedCount / leadsCount) * 100).toFixed(1)}%` : "0%" },
      { stage: "Site Visits Conducted", count: siteVisitsCount, valueLakhs: Number((siteVisitsCount * 9.5).toFixed(1)), conversion: leadsCount > 0 ? `${((siteVisitsCount / leadsCount) * 100).toFixed(1)}%` : "0%" },
      { stage: "Commercial Quotes Issued", count: bookings.length, valueLakhs: Number((totalRealizedRev / 100000).toFixed(1)), conversion: leadsCount > 0 ? `${((bookings.length / leadsCount) * 100).toFixed(1)}%` : "100%" },
      { stage: "Executive HITL Approvals", count: pendingHitlBookings.length, valueLakhs: Number((pendingHitlBookings.reduce((a, c) => a + Number(c.agreedTotalPrice), 0) / 100000).toFixed(1)), conversion: bookings.length > 0 ? `${((pendingHitlBookings.length / bookings.length) * 100).toFixed(1)}%` : "0%" },
      { stage: "Confirmed Unit Bookings", count: confirmedBookings.length, valueLakhs: Number((confirmedBookings.reduce((a, c) => a + Number(c.agreedTotalPrice), 0) / 100000).toFixed(1)), conversion: bookings.length > 0 ? `${((confirmedBookings.length / bookings.length) * 100).toFixed(1)}%` : "100%" },
    ];

    const projectPerformance = projects.map((p) => {
      const totalU = p.units.length;
      const bookedU = p.units.filter((u) => u.status === "BOOKED" || u.status === "RESERVED").length;
      const occ = totalU > 0 ? ((bookedU / totalU) * 100).toFixed(1) : "0.0";
      const totalRev = p.units.filter((u) => u.status === "BOOKED" || u.status === "RESERVED").reduce((acc, u) => acc + Number(u.basePrice), 0);

      return {
        name: p.projectName,
        totalUnits: totalU,
        bookedUnits: bookedU,
        occupancy: `${occ}%`,
        realizedRevenueCr: `₹${(totalRev / 10000000).toFixed(2)} Cr`,
        targetRevenueCr: `₹${(Number(p.totalBudget) / 10000000).toFixed(2)} Cr`,
      };
    });

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
      },
      error: {
        code: "ANALYTICS_ERROR",
        message: err instanceof Error ? err.message : "CRM analytics could not be completed",
      },
      meta: null,
    });
  }
}
