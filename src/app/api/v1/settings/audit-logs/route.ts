import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const actionType = searchParams.get("actionType");
    const search = searchParams.get("search");
    const offset = (page - 1) * limit;

    await runtimeDdl("table:audit_trail_logs", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS audit_trail_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        officer_name VARCHAR(255) NOT NULL,
        module_executed VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        target_description TEXT NOT NULL,
        ip_address VARCHAR(50) NOT NULL DEFAULT 'N/A',
        security_verified BOOLEAN NOT NULL DEFAULT false,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    let records: any[] = [];
    let totalRecords = 0;

    const countResult = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS total
      FROM audit_trail_logs
      WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid
        AND (${actionType ? actionType : null}::text IS NULL OR action_type = ${actionType})
        AND (${search ? `%${search}%` : null}::text IS NULL OR officer_name ILIKE ${search ? `%${search}%` : ""} OR target_description ILIKE ${search ? `%${search}%` : ""})
    `;
    totalRecords = countResult?.[0]?.total ? Number(countResult[0].total) : 0;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM audit_trail_logs
      WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid
        AND (${actionType ? actionType : null}::text IS NULL OR action_type = ${actionType})
        AND (${search ? `%${search}%` : null}::text IS NULL OR officer_name ILIKE ${search ? `%${search}%` : ""} OR target_description ILIKE ${search ? `%${search}%` : ""})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    records = raw || [];

    const mapped = records.map((r: any) => ({
      id: r.id,
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : (r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()),
      officerName: r.officer_name || r.officerName || "System Officer",
      moduleExecuted: r.module_executed || r.moduleExecuted || "General",
      actionType: r.action_type || r.actionType || "Update",
      targetDescription: r.target_description || r.targetDescription || "",
      ipAddress: r.ip_address || r.ipAddress || "N/A",
      securityVerified: Boolean(r.security_verified ?? r.securityVerified ?? false),
    }));

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: {
        page,
        limit,
        total_records: totalRecords,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: [],
      error: {
        code: "AUDIT_LOGS_FETCH_ERROR",
        message: safeErrorMessage(err, "Audit trail logs could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}




