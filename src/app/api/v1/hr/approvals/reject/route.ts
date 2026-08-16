import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id, reason } = body;
    const tenantId = ACTIVE_TENANT_ID;

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

    await runtimeDdl("table:audit_trail_logs", () => prisma.$executeRaw`
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
    `);

    await prisma.$transaction(async (tx) => {
      // 1. Fetch approval item scoped to active tenant
      const approvals = await tx.$queryRaw<any[]>`
        SELECT * FROM hr_approvals 
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      if (!approvals || approvals.length === 0) {
        throw new Error("Approval record not found or does not belong to this tenant");
      }

      const item = approvals[0];
      const rejectionReason = reason || "Rejected by Governance Director";

      // 2. Mark approval as REJECTED with rejection reason
      await tx.$executeRaw`
        UPDATE hr_approvals
        SET status = 'REJECTED', rejection_reason = ${rejectionReason}, updated_at = NOW()
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      // 3. Update specific linked source record
      if (item.type === "PAYROLL_RUN" || item.type === "Payroll Disbursement") {
        if (item.source_id) {
          await tx.$executeRaw`
            UPDATE hr_payroll_runs
            SET status = 'REJECTED', updated_at = NOW()
            WHERE id = ${item.source_id}::uuid AND tenant_id = ${tenantId}::uuid
          `;
        } else {
          // Fallback matching by tenant and pending status for legacy seeds
          await tx.$executeRaw`
            UPDATE hr_payroll_runs
            SET status = 'REJECTED', updated_at = NOW()
            WHERE tenant_id = ${tenantId}::uuid AND status = 'PENDING_APPROVAL'
          `;
        }
      }

      // 4. Record entry in audit trail logs
      const officerName = auth.user?.fullName || "Governance Director";
      await tx.$executeRaw`
        INSERT INTO audit_trail_logs (
          tenant_id, officer_name, module_executed, action_type, target_description, ip_address, security_verified
        ) VALUES (
          ${tenantId}::uuid, ${officerName}, 'HR & People Operations', 'REJECT',
          ${`Rejected HR approval item: ${item.reference_name} (Reason: ${rejectionReason})`},
          '127.0.0.1', true
        )
      `;
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
        code: "HR_REJECT_ERROR",
        message: safeErrorMessage(err, "HR request could not be rejected"),
      },
      meta: null,
    }, { status: 500 });
  }
}
