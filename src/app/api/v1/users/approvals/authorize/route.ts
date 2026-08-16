import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireAdmin, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_ID", message: "Approval ID is required" },
        meta: null,
      }, { status: 400 });
    }

    const tenantId = ACTIVE_TENANT_ID;

    // Atomic transaction: update approval status and elevate target user in system_users
    await prisma.$transaction(async (tx) => {
      const records = await tx.$queryRaw<{ user_id: string | null; target_user_name: string; requested_role: string }[]>`
        UPDATE user_role_approvals
        SET status = 'APPROVED'
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND status = 'PENDING_APPROVAL'
        RETURNING user_id, target_user_name, requested_role
      `;

      if (!records || records.length === 0) {
        throw new Error("Approval record not found or already processed.");
      }

      const item = records[0];
      if (item.user_id) {
        await tx.$executeRaw`
          UPDATE system_users
          SET role = ${item.requested_role}
          WHERE id = ${item.user_id}::uuid AND tenant_id = ${tenantId}::uuid
        `;
      } else {
        await tx.$executeRaw`
          UPDATE system_users
          SET role = ${item.requested_role}
          WHERE full_name = ${item.target_user_name} AND tenant_id = ${tenantId}::uuid
        `;
      }
    });

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id },
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
        code: "USER_AUTHORIZE_ERROR",
        message: safeErrorMessage(err, "User role elevation could not be authorized"),
      },
      meta: null,
    }, { status: 500 });
  }
}
