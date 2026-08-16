import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureLandParcelsTable } from "@/lib/legalDb";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { HITL_LAND_ACQUISITION_LIMIT, REGISTRATION_FEE_RATE, STAMP_DUTY_RATE, LAKH_IN_RUPEES } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

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
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    } else {
      const raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM land_parcels
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY created_at DESC
      `;
      records = raw || [];
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
        acquisitionPhase: r.acquisitionPhase || r.acquisition_phase || "SOURCING",
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
        code: "PARCELS_FETCH_ERROR",
        message: safeErrorMessage(err, "Land parcels could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parcelDescription = (body.parcelDescription || body.parcelName || "").trim();
    const locationZone = (body.locationZone || body.location || "").trim();
    const { plotAreaAcres, applicableFsi, titleStatus } = body;
    const baseLandValueAmount = body.baseLandValueAmount || body.acquisitionCost || body.amount;
    const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

    if (!parcelDescription || !locationZone) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Parcel description and location zone are required." },
        meta: null,
      }, { status: 400 });
    }

    const acres = Number(plotAreaAcres);
    if (!Number.isFinite(acres) || acres <= 0) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_PLOT_AREA", message: "Plot area in acres must be greater than zero." },
        meta: null,
      }, { status: 400 });
    }

    const fsi = Number(applicableFsi);
    if (!Number.isFinite(fsi) || fsi <= 0) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_FSI", message: "Applicable FSI must be a positive number." },
        meta: null,
      }, { status: 400 });
    }

    const baseVal = Number(baseLandValueAmount);
    if (!Number.isFinite(baseVal) || baseVal <= 0) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_VALUATION", message: "Base land valuation must be greater than zero." },
        meta: null,
      }, { status: 400 });
    }

    const validTitles = ["Clear Title", "Title Under Verification", "Litigated / Encumbered"];
    const title = validTitles.includes(titleStatus) ? titleStatus : "Clear Title";

    const stamp = baseVal * STAMP_DUTY_RATE;
    const reg = baseVal * REGISTRATION_FEE_RATE;
    const totalOutlay = baseVal + stamp + reg;

    const requiresHitl = totalOutlay > HITL_LAND_ACQUISITION_LIMIT || title !== "Clear Title";
    const phase = requiresHitl ? "FEASIBILITY" : "DUE_DILIGENCE";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ref = `LND-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    await ensureLandParcelsTable();

    const model = (prisma as any).landParcel;
    let created: any = null;

    if (model?.create) {
      created = await model.create({
        data: {
          tenantId,
          parcelReference: ref,
          parcelDescription,
          locationZone,
          plotAreaAcres: acres,
          applicableFsi: fsi,
          baseLandValueAmount: baseVal,
          stampDutyAmount: stamp,
          registrationAmount: reg,
          totalOutlayAmount: totalOutlay,
          titleStatus: title,
          acquisitionPhase: phase,
          requiresHitl,
        },
      });
    } else {
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO land_parcels (
          tenant_id, parcel_reference, parcel_description, location_zone,
          plot_area_acres, applicable_fsi, base_land_value_amount,
          stamp_duty_amount, registration_amount, total_outlay_amount,
          title_status, acquisition_phase, requires_hitl
        ) VALUES (
          ${tenantId}::uuid, ${ref}, ${parcelDescription}, ${locationZone},
          ${acres}, ${fsi}, ${baseVal}, ${stamp}, ${reg}, ${totalOutlay},
          ${title}, ${phase}, ${requiresHitl}
        )
        RETURNING *
      `;
      created = inserted[0];
    }

    const plotSqft = acres * 43560;
    const constructibleSqft = plotSqft * fsi;

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        parcelReference: created.parcelReference || created.parcel_reference,
        parcelDescription: created.parcelDescription || created.parcel_description,
        locationZone: created.locationZone || created.location_zone,
        plotAreaAcres: acres,
        plotAreaSqft: Math.round(plotSqft),
        applicableFsi: fsi,
        constructibleSqft: Math.round(constructibleSqft),
        baseLandValueAmount: baseVal,
        stampDutyAmount: stamp,
        registrationAmount: reg,
        totalOutlayLakhs: Number((totalOutlay / LAKH_IN_RUPEES).toFixed(2)),
        titleStatus: title,
        acquisitionPhase: phase,
        requiresHitl,
        rejectionReason: null,
        approvedBy: null,
        reviewedAt: null,
        createdAt: created.createdAt || created.created_at,
      },
      error: null,
      meta: null,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "PARCEL_CREATE_ERROR",
        message: safeErrorMessage(err, "Land acquisition proposal could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}




