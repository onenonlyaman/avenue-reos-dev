import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, AuthenticatedContext, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth as AuthenticatedContext;
  const tenantId = user.tenantId;

  try {
    await runtimeDdl("table:customer_timelines", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS customer_timelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        unit_number VARCHAR(100) NOT NULL,
        interaction_type VARCHAR(100) NOT NULL,
        summary TEXT NOT NULL,
        officer_name VARCHAR(255) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM customer_timelines
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY timestamp DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      customerName: r.customer_name,
      unitNumber: r.unit_number,
      interactionType: r.interaction_type,
      summary: r.summary,
      officerName: r.officer_name,
      timestamp: r.timestamp,
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
        code: "CUSTOMER_TIMELINE_FETCH_ERROR",
        message: safeErrorMessage(err, "Customer timeline could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth as AuthenticatedContext;
  const tenantId = user.tenantId;

  try {
    const body = await request.json();
    const { customerName, unitNumber, interactionType, summary } = body;

    if (!customerName || !summary) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Customer name and summary are required." },
        meta: null,
      }, { status: 400 });
    }

    await runtimeDdl("table:customer_timelines", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS customer_timelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        unit_number VARCHAR(100) NOT NULL,
        interaction_type VARCHAR(100) NOT NULL,
        summary TEXT NOT NULL,
        officer_name VARCHAR(255) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO customer_timelines (
        tenant_id, customer_name, unit_number, interaction_type, summary, officer_name, timestamp
      ) VALUES (
        ${tenantId}::uuid, ${customerName}, ${unitNumber || "General Account"},
        ${interactionType || "Call Log"}, ${summary},
        ${user.fullName || "Customer Care Officer"}, NOW()
      )
      RETURNING *
    `;

    const created = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        customerName: created.customer_name,
        unitNumber: created.unit_number,
        interactionType: created.interaction_type,
        summary: created.summary,
        officerName: created.officer_name,
        timestamp: created.timestamp,
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
        code: "CUSTOMER_TIMELINE_CREATE_ERROR",
        message: safeErrorMessage(err, "Customer timeline entry could not be logged"),
      },
      meta: null,
    }, { status: 500 });
  }
}
