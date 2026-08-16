import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const records = await prisma.camInvoice.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { createdAt: "desc" },
    });

    const mapped = records.map((r) => ({
      id: r.id,
      invoiceReference: r.invoiceReference,
      unitName: r.unitName,
      superBuiltupSqft: Number(r.superBuiltupSqft),
      billingPeriod: r.billingPeriod,
      baseCamAmount: Number(r.baseCamAmount),
      gstAmount: Number(r.gstAmount),
      totalDueAmount: Number(r.totalDueAmount),
      paymentStatus: r.paymentStatus,
      issuedDate: r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : "",
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
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: [],
        error: {
          code: "CAM_FETCH_ERROR",
          message: safeErrorMessage(err, "CAM invoices could not be loaded"),
        },
        meta: { total_records: 0 },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { billingPeriod, ratePerSqft } = body;
    const tenantId = ACTIVE_TENANT_ID;
    const rate = Number(ratePerSqft) > 0 ? Number(ratePerSqft) : 3.5;
    const period = String(billingPeriod || "").trim() || "Q3 2026";

    const units = await prisma.masterUnit.findMany({
      where: { tenantId },
      include: { project: true },
    });

    if (units.length === 0) {
      return NextResponse.json(
        {
          success: false,
          status_code: 422,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: {
            code: "NO_UNITS_FOUND",
            message: "No units on record to raise maintenance invoices against",
          },
          meta: null,
        },
        { status: 422 }
      );
    }

    // Check existing invoices for this billing period to prevent duplicate generation
    const existingInvoices = await prisma.camInvoice.findMany({
      where: {
        tenantId,
        billingPeriod: period,
      },
      select: { unitName: true },
    });
    const existingUnitSet = new Set(existingInvoices.map((i) => i.unitName));

    const pendingUnits = units.filter((u) => {
      const unitName = `${u.project?.projectName || "Development"} - Unit ${u.unitNumber}`;
      return !existingUnitSet.has(unitName);
    });

    if (pendingUnits.length === 0) {
      return NextResponse.json({
        success: true,
        status_code: 200,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          success: true,
          generatedCount: 0,
          message: `All units already have CAM invoices generated for ${period}.`,
        },
        error: null,
        meta: null,
      });
    }

    const batchTag = crypto.randomBytes(3).toString("hex").toUpperCase();

    // Create invoices in an atomic batch
    const createOperations = pendingUnits.map((u, idx) => {
      const carpetArea = Number(u.carpetAreaSqft) || 1200;
      // Standard commercial loading factor of 1.25 for super built-up calculation
      const superBuiltupArea = Math.round(carpetArea * 1.25 * 100) / 100;
      const baseCam = Math.round(superBuiltupArea * rate * 100) / 100;
      const gst = Math.round(baseCam * 0.18 * 100) / 100;
      const totalDue = Math.round((baseCam + gst) * 100) / 100;

      const unitName = `${u.project?.projectName || "Development"} - Unit ${u.unitNumber}`;
      const sequenceStr = String(idx + 1).padStart(3, "0");
      const ref = `CAM-${period.replace(/\s+/g, "")}-${batchTag}-${sequenceStr}`;

      return prisma.camInvoice.create({
        data: {
          tenantId,
          invoiceReference: ref,
          unitName,
          superBuiltupSqft: superBuiltupArea,
          billingPeriod: period,
          baseCamAmount: baseCam,
          gstAmount: gst,
          totalDueAmount: totalDue,
          paymentStatus: "UNPAID",
        },
      });
    });

    const results = await prisma.$transaction(createOperations);

    return NextResponse.json(
      {
        success: true,
        status_code: 201,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          success: true,
          generatedCount: results.length,
          billingPeriod: period,
          ratePerSqft: rate,
        },
        error: null,
        meta: null,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "CAM_GENERATE_ERROR",
          message: safeErrorMessage(err, "CAM invoices could not be saved"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
