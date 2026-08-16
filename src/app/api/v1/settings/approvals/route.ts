import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;
    const model = (prisma as any).securityOverrideRequest;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { tenantId, requiresHitl: true, status: "PENDING_GOVERNANCE_APPROVAL" },
        orderBy: { createdAt: "desc" },
      });
    } else {
      await runtimeDdl("table:security_override_requests", () => prisma.$executeRaw`
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
      `);
      const raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM security_override_requests
        WHERE tenant_id = ${tenantId}::uuid AND requires_hitl = true AND status = 'PENDING_GOVERNANCE_APPROVAL'
        ORDER BY created_at DESC
      `;
      records = raw || [];
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
        message: safeErrorMessage(err, "Pending governance approvals could not be loaded"),
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
      requestingAdminName,
      modificationType,
      targetUserOrPolicy,
      justification,
    } = body;

    if (!modificationType || !targetUserOrPolicy || !justification) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Modification type, target policy/user, and justification are required." },
        meta: null,
      }, { status: 400 });
    }

    const adminName = requestingAdminName || auth.user.fullName || auth.user.email || "System Security Officer";
    const requestRef = `OVR-${Date.now().toString(36).toUpperCase()}`;

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO security_override_requests (
        tenant_id, request_reference, requesting_admin_name, modification_type,
        target_user_or_policy, justification, requires_hitl, status
      ) VALUES (
        ${tenantId}::uuid,
        ${requestRef},
        ${adminName.trim()},
        ${modificationType.trim()},
        ${targetUserOrPolicy.trim()},
        ${justification.trim()},
        true,
        'PENDING_GOVERNANCE_APPROVAL'
      )
      RETURNING *
    `;

    const r = inserted[0];
    const mapped = {
      id: r.id,
      requestReference: r.request_reference,
      requestingAdminName: r.requesting_admin_name,
      modificationType: r.modification_type,
      targetUserOrPolicy: r.target_user_or_policy,
      justification: r.justification,
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
        code: "SECURITY_OVERRIDE_CREATE_ERROR",
        message: safeErrorMessage(err, "Security override request could not be logged"),
      },
      meta: null,
    }, { status: 500 });
  }
}
