import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const model = (prisma as any).auditTrailLog;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS audit_trail_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            officer_name VARCHAR(255) NOT NULL,
            module_executed VARCHAR(100) NOT NULL,
            action_type VARCHAR(50) NOT NULL,
            target_description TEXT NOT NULL,
            ip_address VARCHAR(50) NOT NULL,
            security_verified BOOLEAN NOT NULL DEFAULT true,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM audit_trail_logs WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      timestamp: r.timestamp || r.created_at || new Date().toISOString(),
      officerName: r.officerName || r.officer_name || "",
      moduleExecuted: r.moduleExecuted || r.module_executed || "",
      actionType: r.actionType || r.action_type || "Update",
      targetDescription: r.targetDescription || r.target_description || "",
      ipAddress: r.ipAddress || r.ip_address || "192.168.1.10",
      securityVerified: Boolean(r.securityVerified ?? r.security_verified ?? true),
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
        code: "AUDIT_LOGS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Audit trail logs could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}



