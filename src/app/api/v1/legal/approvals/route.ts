import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureLandParcelsTable } from "@/lib/legalDb";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { STAMP_DUTY_RATE, REGISTRATION_FEE_RATE, LAKH_IN_RUPEES } from "@/lib/governance";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

  try {
    await ensureLandParcelsTable();

    const model = (prisma as any).landParcel;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { tenantId, requiresHitl: true, acquisitionPhase: "FEASIBILITY" },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM land_parcels
          WHERE tenant_id = ${tenantId}::uuid AND requires_hitl = true AND acquisition_phase = 'FEASIBILITY'
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
      const stamp = Number(r.stampDutyAmount ?? r.stamp_duty_amount ?? (baseVal * STAMP_DUTY_RATE));
      const reg = Number(r.registrationAmount ?? r.registration_amount ?? (baseVal * REGISTRATION_FEE_RATE));
      const totalOutlay = Number(r.totalOutlayAmount ?? r.total_outlay_amount ?? (baseVal + stamp + reg));

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
        totalOutlayLakhs: Number((totalOutlay / LAKH_IN_RUPEES).toFixed(2)),
        titleStatus: r.titleStatus || r.title_status || "Clear Title",
        acquisitionPhase: r.acquisitionPhase || r.acquisition_phase || "FEASIBILITY",
        requiresHitl: Boolean(r.requiresHitl ?? r.requires_hitl),
        rejectionReason: r.rejectionReason || r.rejection_reason || null,
        approvedBy: r.approvedBy || r.approved_by || null,
        reviewedAt: r.reviewedAt || r.reviewed_at || null,
        createdAt: r.createdAt || r.created_at || new Date().toISOString(),
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

