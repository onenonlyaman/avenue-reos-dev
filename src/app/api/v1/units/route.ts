import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export interface BlueprintSlotConfig {
  slot_number: number;
  typology: string;
  carpet_sqft: number;
  balcony_sqft: number;
  base_rate_sqft: number;
  facing_direction: string;
  parking_bays: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");
  const towerName = searchParams.get("towerName");
  const projectName = searchParams.get("projectName");

  try {
    const whereClause: { tenantId: string; projectId?: string; towerName?: string; project?: { projectName: string } } = {
      tenantId: ACTIVE_TENANT_ID,
    };
    if (projectId) whereClause.projectId = projectId;
    if (towerName) whereClause.towerName = towerName;
    if (projectName) whereClause.project = { projectName };

    const units = await prisma.masterUnit.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            projectName: true,
            location: true,
          },
        },
      },
      orderBy: [{ floorNumber: "desc" }, { unitNumber: "asc" }],
    });

    const mapped = units.map((u) => {
      const carpetAreaSqFt = Number(u.carpetAreaSqft);
      const basePrice = Number(u.basePrice);
      const basePriceLakhs = Number((basePrice / 100000).toFixed(2));
      const floorRisePremium = Number(u.floorRiseCharge || 0);
      const baseRatePerSqFt = carpetAreaSqFt > 0 ? Math.round((basePrice - floorRisePremium) / carpetAreaSqFt) : 0;

      return {
        id: u.id,
        unitNumber: u.unitNumber,
        floorNumber: u.floorNumber,
        towerName: u.towerName,
        projectName: u.project?.projectName ? `${u.project.projectName} - ${u.project.location}` : "Unassigned Project",
        unitType: u.typology || u.unitType,
        typology: u.typology || u.unitType,
        carpetAreaSqFt,
        balconyAreaSqFt: Number(u.balconySqft || 0),
        baseRatePerSqFt,
        basePriceLakhs,
        floorRisePremium,
        facingDirection: u.facingDirection || "",
        parkingAllocations: u.parkingBays || "",
        reraDetails: u.reraDetails || "",
        status: (u.status === "AVAILABLE" ? "Available" : u.status === "BOOKED" ? "Booked" : u.status === "RESERVED" ? "Reserved" : u.status === "BLOCKED" ? "Blocked" : u.status) as "Available" | "Reserved" | "Booked" | "Blocked",
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
        code: "DB_FETCH_UNITS_ERROR",
        message: safeErrorMessage(err, "Unit inventory register is temporarily unavailable"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const {
    projectId,
    towerName,
    maxFloors,
    unitsPerFloor,
    floorRisePerFloor,
    blueprint,
    isBatch,
  } = body;

  if (!projectId) {
    return NextResponse.json({
      success: false,
      status_code: 400,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "PROJECT_NOT_SELECTED",
        message: "A target development project must be selected before inventory can be registered",
      },
    }, { status: 400 });
  }

  if (!towerName) {
    return NextResponse.json({
      success: false,
      status_code: 400,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "TOWER_NOT_SPECIFIED",
        message: "A tower or wing name is required for inventory registration",
      },
    }, { status: 400 });
  }

  try {
    const targetProjectId = projectId;

    if (isBatch && Array.isArray(blueprint) && blueprint.length > 0) {
      const floors = Number(maxFloors) || 0;
      const floorRiseStep = Number(floorRisePerFloor) || 0;
      const tower = towerName;

      const unitsData = [];
      let totalEstRev = 0;

      for (let f = 1; f <= floors; f++) {
        const floorRise = (f - 1) * floorRiseStep;

        for (const slot of blueprint as BlueprintSlotConfig[]) {
          const slotPad = slot.slot_number.toString().padStart(2, "0");
          const unitCode = `${f}${slotPad}`;
          const totalPrice = slot.carpet_sqft * slot.base_rate_sqft + floorRise;
          totalEstRev += totalPrice;

          unitsData.push({
            tenantId: ACTIVE_TENANT_ID,
            projectId: targetProjectId,
            unitNumber: unitCode,
            towerName: tower,
            floorNumber: f,
            unitType: slot.typology,
            carpetAreaSqft: slot.carpet_sqft,
            basePrice: totalPrice,
            status: "AVAILABLE",
            typology: slot.typology,
            balconySqft: slot.balcony_sqft,
            floorRiseCharge: floorRise,
            facingDirection: slot.facing_direction,
            parkingBays: slot.parking_bays,
            reraDetails: body.reraDetails || "",
          });
        }
      }

      await prisma.masterUnit.createMany({
        data: unitsData,
        skipDuplicates: true,
      });

      return NextResponse.json({
        success: true,
        status_code: 201,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          createdCount: unitsData.length,
          estimatedRevenueCr: Number((totalEstRev / 10000000).toFixed(2)),
        },
        error: null,
      }, { status: 201 });
    }

    const { unitNumber, floorNumber, unitType, price, carpetAreaSqFt, balconySqft, facingDirection, parkingBays, reraDetails } = body;

    if (!unitNumber || !floorNumber || !unitType || !carpetAreaSqFt || !price) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_UNIT_RECORD",
          message: "Unit number, floor, typology, carpet area and base price are required",
        },
      }, { status: 400 });
    }

    const createdSingle = await prisma.masterUnit.create({
      data: {
        tenantId: ACTIVE_TENANT_ID,
        projectId: targetProjectId,
        unitNumber,
        towerName,
        floorNumber: Number(floorNumber),
        unitType,
        carpetAreaSqft: Number(carpetAreaSqFt),
        basePrice: Number(price),
        status: "AVAILABLE",
        typology: unitType,
        balconySqft: Number(balconySqft) || 0,
        floorRiseCharge: 0,
        facingDirection: facingDirection || "",
        parkingBays: parkingBays || "",
        reraDetails: reraDetails || "",
      },
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: createdSingle,
      error: null,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "DB_CREATE_UNIT_ERROR",
        message: safeErrorMessage(err, "Unit record could not be registered"),
      },
    }, { status: 500 });
  }
}

