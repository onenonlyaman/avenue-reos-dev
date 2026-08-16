import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;

    await runtimeDdl("table:capital_allocation_requests", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS capital_allocation_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        request_reference VARCHAR(100) NOT NULL,
        project_name VARCHAR(255) NOT NULL,
        requested_capital_lakhs NUMERIC(15,2) NOT NULL,
        allocation_purpose TEXT NOT NULL,
        risk_rating VARCHAR(50) NOT NULL DEFAULT 'Medium',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_BOARD_APPROVAL',
        rejection_reason TEXT,
        reviewed_by VARCHAR(255),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const records = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        tenant_id,
        request_reference,
        project_name,
        requested_capital_lakhs,
        allocation_purpose,
        risk_rating,
        requires_hitl,
        status,
        rejection_reason,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at
      FROM capital_allocation_requests
      WHERE tenant_id = ${tenantId}::uuid 
        AND requires_hitl = true 
        AND status = 'PENDING_BOARD_APPROVAL'
      ORDER BY created_at DESC
    `;

    const mapped = (records || []).map((r: any) => ({
      id: r.id,
      requestReference: r.request_reference || r.requestReference || "",
      projectName: r.project_name || r.projectName || "",
      requestedCapitalLakhs: Number(r.requested_capital_lakhs ?? r.requestedCapitalLakhs ?? 0),
      allocationPurpose: r.allocation_purpose || r.allocationPurpose || "",
      riskRating: r.risk_rating || r.riskRating || "Medium",
      requiresHitl: Boolean(r.requires_hitl ?? r.requiresHitl),
      status: r.status,
      rejectionReason: r.rejection_reason || r.rejectionReason || null,
      reviewedBy: r.reviewed_by || r.reviewedBy || null,
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
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
        message: safeErrorMessage(err, "Pending board approvals could not be loaded"),
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
      projectName,
      requestedCapitalLakhs = 0,
      allocationPurpose,
      riskRating = "Medium",
    } = body;

    if (!projectName || !allocationPurpose) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Project name and capital allocation purpose are required." },
        meta: null,
      }, { status: 400 });
    }

    const requestRef = `CAP-${Date.now().toString(36).toUpperCase()}`;
    const amount = Number(requestedCapitalLakhs) || 0;

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO capital_allocation_requests (
        tenant_id, request_reference, project_name, requested_capital_lakhs,
        allocation_purpose, risk_rating, requires_hitl, status
      ) VALUES (
        ${tenantId}::uuid,
        ${requestRef},
        ${projectName.trim()},
        ${amount},
        ${allocationPurpose.trim()},
        ${riskRating.trim()},
        true,
        'PENDING_BOARD_APPROVAL'
      )
      RETURNING *
    `;

    const r = inserted[0];
    const mapped = {
      id: r.id,
      requestReference: r.request_reference,
      projectName: r.project_name,
      requestedCapitalLakhs: Number(r.requested_capital_lakhs || 0),
      allocationPurpose: r.allocation_purpose,
      riskRating: r.risk_rating,
      requiresHitl: Boolean(r.requires_hitl),
      status: r.status,
      createdAt: r.created_at,
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
        code: "CAPITAL_ALLOCATION_CREATE_ERROR",
        message: safeErrorMessage(err, "Capital allocation proposal could not be submitted"),
      },
      meta: null,
    }, { status: 500 });
  }
}
