import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const projects = await prisma.masterProject.findMany({ where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { createdAt: "desc" },
    });

    const mapped = projects.map((p) => {
      const area = Number(p.totalAreaSqft || 0);
      const budget = Number(p.totalBudget || 0);
      const avgRate = 6500;
      const gdvAmount = area * avgRate;
      const navAmount = gdvAmount - budget;

      return {
        id: p.id,
        projectName: p.projectName,
        developmentType: area > 300000 ? "Mixed-Use Township" : "Luxury Residential",
        totalSaleableAreaSqft: Math.round(area),
        avgRealizedRatePerSqft: avgRate,
        grossDevelopmentValueCr: Number((gdvAmount / 10000000).toFixed(2)),
        netAssetValueCr: Number((navAmount / 10000000).toFixed(2)),
        status: (p.status === "ACTIVE" ? "ACTIVE" : "COMPLETED") as "ACTIVE" | "COMPLETED" | "PIPELINE",
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
        message: err instanceof Error ? err.message : "Portfolio valuation metrics could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}
