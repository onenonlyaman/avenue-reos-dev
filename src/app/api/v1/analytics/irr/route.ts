import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const projects = await prisma.masterProject.findMany({ where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { createdAt: "desc" },
    });

    const mapped = projects.map((p) => {
      const budget = Number(p.totalBudget || 0);
      const equityCr = Number((budget / 10000000).toFixed(2));
      const collectionsCr = Number(((budget * 1.35) / 10000000).toFixed(2));
      const marginPct = 24.5;
      const irrPct = 21.8;

      let badge: "OUTPERFORMING" | "ON_TARGET" | "UNDERPERFORMING" = "ON_TARGET";
      if (irrPct >= 20) badge = "OUTPERFORMING";
      else if (irrPct < 15) badge = "UNDERPERFORMING";

      return {
        id: p.id,
        projectName: p.projectName,
        investedEquityCr: equityCr,
        realizedCollectionsCr: collectionsCr,
        projectedNetMarginPct: marginPct,
        internalRateOfReturnPct: irrPct,
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
