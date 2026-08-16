import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { HITL_ELEVATED_AUTHORITY_LIMIT } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { userId, userName, targetRole, financialLimit } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!targetRole) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_ROLE", message: "Target role is required." },
        meta: null,
      }, { status: 400 });
    }

    const isElevatedRole = targetRole === "Governance Director" || targetRole === "Super Admin";
    const isElevatedLimit = Number(financialLimit || 0) > HITL_ELEVATED_AUTHORITY_LIMIT;
    const requiresHitl = isElevatedRole || isElevatedLimit;

    if (requiresHitl) {
      await runtimeDdl("table:user_role_approvals", () => prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS user_role_approvals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          user_id UUID,
          target_user_name VARCHAR(255) NOT NULL,
          requested_role VARCHAR(100) NOT NULL,
          requested_financial_limit NUMERIC(15,2) NOT NULL DEFAULT 0,
          justification TEXT NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
          requires_hitl BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      try {
        await prisma.$executeRaw`ALTER TABLE user_role_approvals ADD COLUMN IF NOT EXISTS user_id UUID`;
      } catch {
        // column already exists
      }

      await prisma.$executeRaw`
        INSERT INTO user_role_approvals (
          tenant_id, user_id, target_user_name, requested_role, requested_financial_limit, justification, status, requires_hitl
        ) VALUES (
          ${tenantId}::uuid, ${userId ? userId : null}::uuid, ${userName || "Employee User"}, ${targetRole}, ${financialLimit || 0},
          'Elevating role to Governance Director or expanding financial authority > ₹10 Lakhs requires executive approval',
          'PENDING_APPROVAL', true
        )
      `;

      return NextResponse.json({
        success: true,
        status_code: 200,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: { success: true, requiresHitl: true },
        error: null,
        meta: null,
      });
    }

    if (userId) {
      await prisma.$executeRaw`
        UPDATE system_users
        SET role = ${targetRole}
        WHERE id = ${userId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE system_users
        SET role = ${targetRole}
        WHERE full_name = ${userName} AND tenant_id = ${tenantId}::uuid
      `;
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, requiresHitl: false },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "USER_ROLE_UPDATE_ERROR",
        message: safeErrorMessage(err, "User role could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}

