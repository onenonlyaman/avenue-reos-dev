import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;

    await runtimeDdl("table:enterprise_risks", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS enterprise_risks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        risk_category VARCHAR(100) NOT NULL,
        associated_project_site VARCHAR(255) NOT NULL,
        risk_vector_summary TEXT NOT NULL,
        impact_rating VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
        mitigation_action_plan TEXT NOT NULL,
        risk_level VARCHAR(50) NOT NULL DEFAULT 'Medium',
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const records = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        tenant_id,
        risk_category,
        associated_project_site,
        risk_vector_summary,
        impact_rating,
        mitigation_action_plan,
        risk_level,
        requires_hitl,
        created_at,
        updated_at
      FROM enterprise_risks
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `;

    const mapped = (records || []).map((r: any) => ({
      id: r.id,
      riskCategory: r.risk_category || r.riskCategory || "",
      associatedProjectSite: r.associated_project_site || r.associatedProjectSite || "",
      riskVectorSummary: r.risk_vector_summary || r.riskVectorSummary || "",
      impactRating: r.impact_rating || r.impactRating || "MEDIUM",
      mitigationActionPlan: r.mitigation_action_plan || r.mitigationActionPlan || "",
      riskLevel: r.risk_level || r.riskLevel || "Medium",
      requiresHitl: Boolean(r.requires_hitl ?? r.requiresHitl),
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
        message: safeErrorMessage(err, "Enterprise risk matrix could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;
    const body = await request.json();

    const {
      riskCategory,
      associatedProjectSite,
      riskVectorSummary,
      impactRating = "HIGH",
      mitigationActionPlan,
      riskLevel = "High",
      requiresHitl = false,
    } = body;

    if (!riskCategory || !associatedProjectSite || !riskVectorSummary || !mitigationActionPlan) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Risk category, associated project site, summary, and mitigation plan are required.",
        },
        meta: null,
      }, { status: 400 });
    }

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO enterprise_risks (
        tenant_id, risk_category, associated_project_site, risk_vector_summary,
        impact_rating, mitigation_action_plan, risk_level, requires_hitl
      ) VALUES (
        ${tenantId}::uuid,
        ${riskCategory.trim()},
        ${associatedProjectSite.trim()},
        ${riskVectorSummary.trim()},
        ${impactRating.trim().toUpperCase()},
        ${mitigationActionPlan.trim()},
        ${riskLevel.trim()},
        ${Boolean(requiresHitl)}
      )
      RETURNING *
    `;

    const r = inserted[0];
    const mapped = {
      id: r.id,
      riskCategory: r.risk_category,
      associatedProjectSite: r.associated_project_site,
      riskVectorSummary: r.risk_vector_summary,
      impactRating: r.impact_rating,
      mitigationActionPlan: r.mitigation_action_plan,
      riskLevel: r.risk_level,
      requiresHitl: Boolean(r.requires_hitl),
    };

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
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
        code: "RISK_CREATE_ERROR",
        message: safeErrorMessage(err, "Enterprise risk record could not be logged"),
      },
      meta: null,
    }, { status: 500 });
  }
}
