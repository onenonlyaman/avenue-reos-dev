import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const model = (prisma as any).capitalAllocationRequest;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { requiresHitl: true, status: "PENDING_BOARD_APPROVAL" },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS capital_allocation_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
            request_reference VARCHAR(100) NOT NULL,
            project_name VARCHAR(255) NOT NULL,
            requested_capital_lakhs DECIMAL(15,2) NOT NULL,
            allocation_purpose VARCHAR(255) NOT NULL,
            risk_rating VARCHAR(50) NOT NULL DEFAULT 'Medium',
            requires_hitl BOOLEAN NOT NULL DEFAULT true,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING_BOARD_APPROVAL',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;

        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM capital_allocation_requests
          WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND requires_hitl = true AND status = 'PENDING_BOARD_APPROVAL'
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
      projectName: r.projectName || r.project_name || "",
      requestedCapitalLakhs: Number(r.requestedCapitalLakhs ?? r.requested_capital_lakhs ?? 0),
      allocationPurpose: r.allocationPurpose || r.allocation_purpose || "",
      riskRating: r.riskRating || r.risk_rating || "Medium",
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
        code: "PENDING_BOARD_APPROVALS_ERROR",
        message: err instanceof Error ? err.message : "Pending board approvals could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

