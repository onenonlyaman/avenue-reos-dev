import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const model = (prisma as any).enterpriseRisk;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS enterprise_risks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
            risk_category VARCHAR(100) NOT NULL,
            associated_project_site VARCHAR(255) NOT NULL,
            risk_vector_summary VARCHAR(255) NOT NULL,
            impact_rating VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
            mitigation_action_plan TEXT NOT NULL,
            risk_level VARCHAR(50) NOT NULL DEFAULT 'Medium',
            requires_hitl BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;

        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM enterprise_risks WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      riskCategory: r.riskCategory || r.risk_category || "",
      associatedProjectSite: r.associatedProjectSite || r.associated_project_site || "",
      riskVectorSummary: r.riskVectorSummary || r.risk_vector_summary || "",
      impactRating: r.impactRating || r.impact_rating || "MEDIUM",
      mitigationActionPlan: r.mitigationActionPlan || r.mitigation_action_plan || "",
      riskLevel: r.riskLevel || r.risk_level || "Medium",
      requiresHitl: Boolean(r.requiresHitl ?? r.requires_hitl),
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
        code: "RISK_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Enterprise risk matrix could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}



