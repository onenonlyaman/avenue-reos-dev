import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const customers = await prisma.masterCustomer.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { createdAt: "desc" },
    });

    const mapped = customers.map((c) => ({
      id: c.id,
      customerCode: c.customerCode,
      fullName: c.fullName,
      email: c.email || "",
      phoneNumber: c.phoneNumber || "",
      taxIdentifier: c.taxIdentifier || "",
      customerType: c.customerType,
      status: c.status,
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
        code: "CUSTOMERS_FETCH_ERROR",
        message: safeErrorMessage(err, "Customer register could not be loaded"),
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
    const { customerCode, fullName, email, phoneNumber, taxIdentifier, customerType } = body;

    if (!fullName || !phoneNumber) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_CUSTOMER_RECORD",
          message: "Customer name and contact number are required",
        },
        meta: null,
      }, { status: 400 });
    }

    const created = await prisma.masterCustomer.create({
      data: {
        tenantId: ACTIVE_TENANT_ID,
        customerCode: customerCode || `CUST-${Date.now().toString().slice(-6)}`,
        fullName,
        email: email || "",
        phoneNumber,
        taxIdentifier: taxIdentifier || null,
        customerType: customerType || "INDIVIDUAL",
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        customerCode: created.customerCode,
        fullName: created.fullName,
        email: created.email || "",
        phoneNumber: created.phoneNumber || "",
        taxIdentifier: created.taxIdentifier || "",
        customerType: created.customerType,
        status: created.status,
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
        code: "CUSTOMER_CREATE_ERROR",
        message: safeErrorMessage(err, "Customer record could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}
