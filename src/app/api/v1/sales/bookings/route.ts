import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const bookings = await prisma.salesBooking.findMany({
      where: { tenantId: auth.user.tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        unit: {
          include: {
            project: true,
          },
        },
        salesRep: true,
      },
    });

    const mapped = bookings.map((b) => ({
      id: b.id,
      bookingCode: b.bookingCode,
      customerName: b.customer?.fullName || "",
      customerPhone: b.customer?.phoneNumber || "",
      customerEmail: b.customer?.email || "",
      unitNumber: b.unit?.unitNumber || "",
      towerName: b.unit?.towerName || "",
      projectName: b.unit?.project?.projectName || "",
      agreedTotalPrice: Number(b.agreedTotalPrice),
      bookingDepositAmount: Number(b.bookingDepositAmount),
      discountPercentage: Number(b.discountPercentage || 0),
      status: b.status,
      salesRepName: b.salesRep?.fullName || "Unassigned",
      paymentPlanJson: b.paymentPlanJson,
      createdDate: b.createdAt.toISOString().split("T")[0],
    }));

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
        code: "DB_FETCH_BOOKINGS_ERROR",
        message: safeErrorMessage(err, "Sales bookings could not be loaded"),
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
    unitId,
    unitNumber,
    projectId,
    customerName,
    customerPhone,
    customerEmail,
    agreedTotalPrice,
    bookingDepositAmount,
    discountPercentage,
    quotation_breakdown_json,
    requiresHitl,
    salesRepNotes,
    salesRepName,
  } = body;

  try {
    const tenantId = auth.user.tenantId;

    let customer = customerPhone
      ? await prisma.masterCustomer.findFirst({
          where: { tenantId, phoneNumber: customerPhone },
        })
      : null;

    if (!customer && customerName) {
      customer = await prisma.masterCustomer.findFirst({
        where: { tenantId, fullName: customerName },
      });
    }

    if (!customer) {
      const effectiveName = customerName || "Prospective Buyer";
      const effectivePhone = customerPhone || `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const randomSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      customer = await prisma.masterCustomer.create({
        data: {
          tenantId,
          customerCode: `CUST-${randomSuffix}`,
          fullName: effectiveName,
          email: customerEmail || "",
          phoneNumber: effectivePhone,
          customerType: "INDIVIDUAL",
          status: "ACTIVE",
        },
      });
    }

    let targetUnit = null;
    if (unitId) {
      targetUnit = await prisma.masterUnit.findFirst({
        where: { id: unitId, tenantId },
      });
    }

    const effectiveUnitNumber = unitNumber || body.unitName;
    if (!targetUnit && effectiveUnitNumber) {
      targetUnit = await prisma.masterUnit.findFirst({
        where: {
          tenantId,
          OR: [
            { unitNumber: effectiveUnitNumber },
            { unitNumber: effectiveUnitNumber.replace(/.*Unit\s*/i, "").trim() },
          ],
        },
      });
    }

    if (!targetUnit || targetUnit.status !== "AVAILABLE") {
      targetUnit = await prisma.masterUnit.findFirst({
        where: {
          tenantId,
          status: "AVAILABLE",
        },
      });
    }

    if (!targetUnit) {
      const project = await prisma.masterProject.findFirst({ where: { tenantId } });
      if (project) {
        targetUnit = await prisma.masterUnit.create({
          data: {
            tenantId,
            projectId: project.id,
            towerName: "Tower A",
            floorNumber: 1,
            unitNumber: `U-${Date.now().toString(36).toUpperCase()}`,
            unitType: "2BHK",
            carpetAreaSqft: 850,
            basePrice: 6500000,
            status: "AVAILABLE",
          },
        });
      }
    }

    if (!targetUnit) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "UNIT_NOT_FOUND",
          message: "The requested unit was not found in the inventory register",
        },
      }, { status: 404 });
    }

    if (targetUnit.status !== "AVAILABLE") {
      return NextResponse.json({
        success: false,
        status_code: 409,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "UNIT_NOT_AVAILABLE",
          message: `Unit ${targetUnit.unitNumber} is currently ${targetUnit.status} and cannot be booked`,
        },
      }, { status: 409 });
    }

    const salesRep = salesRepName
      ? await prisma.masterEmployee.findFirst({
          where: { tenantId, fullName: salesRepName, status: "ACTIVE" },
        })
      : await prisma.masterEmployee.findFirst({
          where: { tenantId, status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
        });

    if (!salesRep) {
      return NextResponse.json({
        success: false,
        status_code: 409,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "SALES_REPRESENTATIVE_UNAVAILABLE",
          message: "No active sales representative is on record to own this booking",
        },
      }, { status: 409 });
    }

    const bookingStatus = requiresHitl ? "PENDING_APPROVAL" : "APPROVED";
    const unitTargetStatus = requiresHitl ? "RESERVED" : "BOOKED";
    const randomBookingSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const bookingCode = `SB-${randomBookingSuffix}`;

    const result = await prisma.$transaction(async (tx) => {
      const lockResult = await tx.masterUnit.updateMany({
        where: {
          id: targetUnit!.id,
          tenantId,
          status: "AVAILABLE",
        },
        data: {
          status: unitTargetStatus,
        },
      });

      if (lockResult.count === 0) {
        throw new Error("UNIT_CONCURRENTLY_RESERVED");
      }

      const createdBooking = await tx.salesBooking.create({
        data: {
          tenantId,
          bookingCode,
          customerId: customer!.id,
          unitId: targetUnit!.id,
          salesRepId: salesRep!.id,
          agreedTotalPrice: Number(agreedTotalPrice) || Number(targetUnit!.basePrice),
          bookingDepositAmount: Number(bookingDepositAmount) || 0,
          discountPercentage: Number(discountPercentage) || 0,
          status: bookingStatus,
          paymentPlanJson: (quotation_breakdown_json || {
            notes: salesRepNotes || "Standard sales quotation terms applied.",
          }) as unknown as import("@prisma/client").Prisma.InputJsonValue,
        },
      });

      return createdBooking;
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: result.id,
        bookingCode: result.bookingCode,
        unitId: targetUnit.id,
        unitNumber: targetUnit.unitNumber,
        unitStatus: unitTargetStatus,
        bookingStatus: result.status,
        agreedTotalPrice: Number(result.agreedTotalPrice),
        requiresHitl,
      },
      error: null,
    }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error && err.message === "UNIT_CONCURRENTLY_RESERVED"
      ? "This unit was reserved by another transaction. Please select an available unit."
      : safeErrorMessage(err, "Sales booking could not be saved");

    const statusCode = err instanceof Error && err.message === "UNIT_CONCURRENTLY_RESERVED" ? 409 : 500;

    return NextResponse.json({
      success: false,
      status_code: statusCode,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: statusCode === 409 ? "UNIT_ALREADY_RESERVED" : "CREATE_BOOKING_ERROR",
        message: errorMsg,
      },
    }, { status: statusCode });
  }
}
