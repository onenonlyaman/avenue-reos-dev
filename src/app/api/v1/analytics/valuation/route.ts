import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;

    const projects = await prisma.masterProject.findMany({
      where: { tenantId },
      include: {
        units: {
          include: {
            salesBookings: {
              where: {
                status: {
                  in: ["APPROVED", "POSSESSION_HANDED_OVER", "BOOKED"],
                },
              },
            },
          },
        },
        costCenters: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = projects.map((p) => {
      const declaredArea = Number(p.totalAreaSqft || 0);
      const budget = Number(p.totalBudget || 0);

      let totalUnitArea = 0;
      let totalUnitGdv = 0;

      if (p.units.length > 0) {
        for (const u of p.units) {
          const unitArea = Number(u.carpetAreaSqft || 0) + Number(u.balconySqft || 0);
          totalUnitArea += unitArea;

          const confirmedBooking = u.salesBookings?.[0];
          if (confirmedBooking && Number(confirmedBooking.agreedTotalPrice) > 0) {
            totalUnitGdv += Number(confirmedBooking.agreedTotalPrice);
          } else {
            totalUnitGdv += Number(u.basePrice || 0) + Number(u.floorRiseCharge || 0);
          }
        }
      }

      const totalSaleableArea = totalUnitArea > 0 ? totalUnitArea : declaredArea;
      const gdvAmount = totalUnitGdv > 0 ? totalUnitGdv : totalSaleableArea * 6200;
      const navAmount = Math.max(0, gdvAmount - budget);
      const avgRate = totalSaleableArea > 0 ? Math.round(gdvAmount / totalSaleableArea) : 0;

      let devType = "Luxury Residential";
      if (declaredArea >= 500000 || p.projectName.toLowerCase().includes("township")) {
        devType = "Mixed-Use Township";
      } else if (p.projectName.toLowerCase().includes("commercial") || p.projectName.toLowerCase().includes("plaza")) {
        devType = "Commercial Complex";
      }

      let statusFormatted: "ACTIVE" | "COMPLETED" | "PIPELINE" = "ACTIVE";
      if (p.status === "COMPLETED") {
        statusFormatted = "COMPLETED";
      } else if (p.status === "PIPELINE" || p.status === "PLANNING") {
        statusFormatted = "PIPELINE";
      }

      return {
        id: p.id,
        projectName: p.projectName,
        developmentType: devType,
        totalSaleableAreaSqft: Math.round(totalSaleableArea),
        avgRealizedRatePerSqft: avgRate,
        grossDevelopmentValueCr: Number((gdvAmount / 10000000).toFixed(2)),
        netAssetValueCr: Number((navAmount / 10000000).toFixed(2)),
        status: statusFormatted,
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
        code: "VALUATION_FETCH_ERROR",
        message: safeErrorMessage(err, "Portfolio valuation metrics could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
