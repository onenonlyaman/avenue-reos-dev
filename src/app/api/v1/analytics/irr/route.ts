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
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = projects.map((p) => {
      const budget = Number(p.totalBudget || 0);
      const equityCr = Number((budget / 10000000).toFixed(2));

      let realizedCollections = 0;
      let totalProjectedGdv = 0;

      for (const u of p.units) {
        const confirmedBooking = u.salesBookings?.[0];
        if (confirmedBooking && Number(confirmedBooking.agreedTotalPrice) > 0) {
          const bookedAmt = Number(confirmedBooking.agreedTotalPrice);
          realizedCollections += bookedAmt;
          totalProjectedGdv += bookedAmt;
        } else {
          totalProjectedGdv += Number(u.basePrice || 0) + Number(u.floorRiseCharge || 0);
        }
      }

      if (totalProjectedGdv === 0 && Number(p.totalAreaSqft) > 0) {
        totalProjectedGdv = Number(p.totalAreaSqft) * 6200;
      }

      const collectionsCr = Number((realizedCollections / 10000000).toFixed(2));

      // Net margin = (GDV - Cost) / GDV * 100
      let marginPct = 0;
      if (totalProjectedGdv > 0) {
        marginPct = Number((((totalProjectedGdv - budget) / totalProjectedGdv) * 100).toFixed(1));
      }

      // Calculate project execution duration in years
      const start = new Date(p.startDate || "2025-01-01").getTime();
      const end = new Date(p.expectedCompletionDate || "2028-12-31").getTime();
      const diffYears = Math.max(1, Math.min(10, (end - start) / (365.25 * 24 * 3600 * 1000)));

      // Annualized IRR = ((Total Realizable Return / Invested Budget) ^ (1 / durationYears) - 1) * 100
      let irrPct = 0;
      if (budget > 0 && totalProjectedGdv > 0) {
        const multiple = totalProjectedGdv / budget;
        if (multiple > 0) {
          irrPct = Number(((Math.pow(multiple, 1 / diffYears) - 1) * 100).toFixed(1));
        }
      }

      let badge: "OUTPERFORMING" | "ON_TARGET" | "UNDERPERFORMING" = "ON_TARGET";
      if (irrPct >= 20.0) {
        badge = "OUTPERFORMING";
      } else if (irrPct < 14.0) {
        badge = "UNDERPERFORMING";
      }

      return {
        id: p.id,
        projectName: p.projectName,
        investedEquityCr: equityCr,
        realizedCollectionsCr: collectionsCr,
        projectedNetMarginPct: Math.max(0, marginPct),
        internalRateOfReturnPct: Math.max(0, irrPct),
        performanceBadge: badge,
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
        code: "IRR_FETCH_ERROR",
        message: safeErrorMessage(err, "Project IRR metrics could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
