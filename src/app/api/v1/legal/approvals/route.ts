import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const model = (prisma as any).landParcel;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { requiresHitl: true, acquisitionPhase: "FEASIBILITY" },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM land_parcels
          WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND requires_hitl = true AND acquisition_phase = 'FEASIBILITY'
          ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => {
      const plotAcres = Number(r.plotAreaAcres ?? r.plot_area_acres ?? 0);
      const fsi = Number(r.applicableFsi ?? r.applicable_fsi ?? 1.5);
      const plotSqft = plotAcres * 43560;
      const constructibleSqft = plotSqft * fsi;
      const baseVal = Number(r.baseLandValueAmount ?? r.base_land_value_amount ?? 0);
      const stamp = baseVal * 0.07;
      const reg = baseVal * 0.01;
      const totalOutlay = baseVal + stamp + reg;

      return {
        id: r.id,
        parcelReference: r.parcelReference || r.parcel_reference || "",
        parcelDescription: r.parcelDescription || r.parcel_description || "",
        locationZone: r.locationZone || r.location_zone || "",
        plotAreaAcres: plotAcres,
        plotAreaSqft: Math.round(plotSqft),
        applicableFsi: fsi,
        constructibleSqft: Math.round(constructibleSqft),
        baseLandValueAmount: baseVal,
        stampDutyAmount: stamp,
        registrationAmount: reg,
        totalOutlayLakhs: Number((totalOutlay / 100000).toFixed(2)),
        titleStatus: r.titleStatus || r.title_status || "Clear Title",
        acquisitionPhase: r.acquisitionPhase || r.acquisition_phase || "FEASIBILITY",
        requiresHitl: Boolean(r.requiresHitl ?? r.requires_hitl),
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
        code: "PENDING_LEGAL_APPROVALS_ERROR",
        message: safeErrorMessage(err, "Pending legal committee approvals could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

