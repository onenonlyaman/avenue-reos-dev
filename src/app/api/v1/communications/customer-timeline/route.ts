import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

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
      SELECT * FROM customer_timelines WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY timestamp DESC
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



