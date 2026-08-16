import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:hr_approvals", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hr_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        source_id UUID,
        type VARCHAR(50) NOT NULL,
        reference_name VARCHAR(255) NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        justification TEXT NOT NULL,
        requested_by VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await runtimeDdl("alter:hr_approvals_source_id", () => prisma.$executeRaw`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE hr_approvals ADD COLUMN source_id UUID;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE hr_approvals ADD COLUMN rejection_reason TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE hr_approvals ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        EXCEPTION WHEN duplicate_column THEN NULL; END;
      END $$;
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM hr_approvals 
      WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND status = 'PENDING_APPROVAL' 
      ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      sourceId: r.source_id,
      type: r.type,
      referenceName: r.reference_name,
      amount: Number(r.amount || 0),
      justification: r.justification,
      requestedBy: r.requested_by,
      status: r.status,
      requiresHitl: Boolean(r.requires_hitl),
      rejectionReason: r.rejection_reason || null,
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
        code: "HR_APPROVALS_FETCH_ERROR",
        message: safeErrorMessage(err, "HR pending approvals could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
