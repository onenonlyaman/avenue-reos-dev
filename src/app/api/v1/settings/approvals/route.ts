import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const model = (prisma as any).securityOverrideRequest;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { requiresHitl: true, status: "PENDING_GOVERNANCE_APPROVAL" },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS security_override_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            request_reference VARCHAR(100) NOT NULL,
            requesting_admin_name VARCHAR(255) NOT NULL,
            modification_type VARCHAR(100) NOT NULL,
            target_user_or_policy VARCHAR(255) NOT NULL,
            justification TEXT NOT NULL,
            requires_hitl BOOLEAN NOT NULL DEFAULT true,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING_GOVERNANCE_APPROVAL',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM security_override_requests
          WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND requires_hitl = true AND status = 'PENDING_GOVERNANCE_APPROVAL'
          ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      requestReference: r.requestReference || r.request_reference || "",
      requestingAdminName: r.requestingAdminName || r.requesting_admin_name || "",
      modificationType: r.modificationType || r.modification_type || "",
      targetUserOrPolicy: r.targetUserOrPolicy || r.target_user_or_policy || "",
      justification: r.justification || "",
      requiresHitl: Boolean(r.requiresHitl ?? r.requires_hitl),
      status: r.status,
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
        code: "PENDING_GOVERNANCE_APPROVALS_ERROR",
        message: err instanceof Error ? err.message : "Pending governance approvals could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

