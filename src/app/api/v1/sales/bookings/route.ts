import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const bookings = await prisma.salesBooking.findMany({ where: { tenantId: ACTIVE_TENANT_ID },
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
    const tenantId = ACTIVE_TENANT_ID;

    let customer = customerPhone
      ? await prisma.masterCustomer.findFirst({
          where: { tenantId: ACTIVE_TENANT_ID, phoneNumber: customerPhone },
        })
      : null;

    if (!customer && customerName) {
      customer = await prisma.masterCustomer.findFirst({
        where: { tenantId: ACTIVE_TENANT_ID, fullName: customerName },
      });
    }

    if (!customer) {
      if (!customerName) {
        return NextResponse.json({
          success: false,
          status_code: 400,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: {
            code: "CUSTOMER_NOT_IDENTIFIED",
            message: "A customer name or registered contact number is required to raise a booking",
          },
        }, { status: 400 });
      }

      customer = await prisma.masterCustomer.create({
        data: {
          tenantId,
          customerCode: `CUST-${Date.now().toString().slice(-6)}`,
          fullName: customerName,
          email: customerEmail || "",
          phoneNumber: customerPhone || "",
          customerType: "INDIVIDUAL",
          status: "ACTIVE",
        },
      });
    }

    let targetUnit = null;
    if (unitId) {
      targetUnit = await prisma.masterUnit.findUnique({
        where: { id: unitId },
      });
    }

    if (!targetUnit && unitNumber) {
      targetUnit = await prisma.masterUnit.findFirst({
        where: { tenantId: ACTIVE_TENANT_ID,
          unitNumber,
          ...(projectId ? { projectId } : {}),
        },
      });
    }

    if (!targetUnit) {
      targetUnit = await prisma.masterUnit.findFirst({ where: { tenantId: ACTIVE_TENANT_ID } });
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
          message: "The selected unit is not on record",
        },
      }, { status: 404 });
    }

    const salesRep = salesRepName
      ? await prisma.masterEmployee.findFirst({
          where: { tenantId: ACTIVE_TENANT_ID, fullName: salesRepName, status: "ACTIVE" },
        })
      : await prisma.masterEmployee.findFirst({
          where: { tenantId: ACTIVE_TENANT_ID, status: "ACTIVE" },
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

    const bookingStatus = requiresHitl ? "PENDING_APPROVAL" : "CONFIRMED";
    const unitTargetStatus = requiresHitl ? "RESERVED" : "BOOKED";

    const bookingCode = `SB-${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
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

      await tx.masterUnit.update({
        where: { id: targetUnit!.id },
        data: {
          status: unitTargetStatus,
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
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "CREATE_BOOKING_ERROR",
        message: safeErrorMessage(err, "Sales booking could not be saved"),
      },
    }, { status: 500 });
  }
}
