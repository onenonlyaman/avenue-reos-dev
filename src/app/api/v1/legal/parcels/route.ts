import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { HITL_LAND_ACQUISITION_LIMIT, REGISTRATION_FEE_RATE, STAMP_DUTY_RATE } from "@/lib/governance";

export async function GET() {
  try {
    const model = (prisma as any).landParcel;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM land_parcels WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
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
      const stamp = baseVal * STAMP_DUTY_RATE;
      const reg = baseVal * REGISTRATION_FEE_RATE;
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
        acquisitionPhase: r.acquisitionPhase || r.acquisition_phase || "SOURCING",
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
        code: "PARCELS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Land parcels could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parcelDescription, locationZone, plotAreaAcres, applicableFsi, baseLandValueAmount, titleStatus } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!parcelDescription || !locationZone) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Parcel description and location zone are required." },
        meta: null,
      });
    }

    const acres = Number(plotAreaAcres || 0);
    const fsi = Number(applicableFsi || 1.5);
    const baseVal = Number(baseLandValueAmount || 0);
    const stamp = baseVal * STAMP_DUTY_RATE;
    const reg = baseVal * REGISTRATION_FEE_RATE;
    const totalOutlay = baseVal + stamp + reg;

    const title = titleStatus || "Clear Title";
    const requiresHitl = totalOutlay > HITL_LAND_ACQUISITION_LIMIT || title !== "Clear Title";
    const phase = requiresHitl ? "FEASIBILITY" : "DUE_DILIGENCE";
    const ref = `LND-${Date.now().toString().slice(-6)}`;

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
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS land_parcels (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            parcel_reference VARCHAR(100) NOT NULL,
            parcel_description VARCHAR(255) NOT NULL,
            location_zone VARCHAR(255) NOT NULL,
            plot_area_acres DECIMAL(15,2) NOT NULL,
            applicable_fsi DECIMAL(5,2) NOT NULL,
            base_land_value_amount DECIMAL(15,2) NOT NULL,
            stamp_duty_amount DECIMAL(15,2) NOT NULL,
            registration_amount DECIMAL(15,2) NOT NULL,
            total_outlay_amount DECIMAL(15,2) NOT NULL,
            title_status VARCHAR(100) NOT NULL,
            acquisition_phase VARCHAR(50) NOT NULL,
            requires_hitl BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
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
      } catch (err: unknown) {
        throw new Error(err instanceof Error ? err.message : "Land parcel could not be saved");
      }
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
        totalOutlayLakhs: Number((totalOutlay / 100000).toFixed(2)),
        titleStatus: title,
        acquisitionPhase: phase,
        requiresHitl,
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
      data: null,
      error: {
        code: "PARCEL_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Land acquisition proposal could not be saved",
      },
      meta: null,
    });
  }
}




