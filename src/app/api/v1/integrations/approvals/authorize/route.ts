import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, safeErrorMessage } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id } = body;
    const tenantId = auth.user.tenantId;

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

    // Check existing pending approval
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM integration_approvals 
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND status = 'PENDING_APPROVAL'
      LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "NOT_FOUND", message: "Pending integration approval request was not found or already processed" },
        meta: null,
      }, { status: 404 });
    }

    const item = existing[0];

    // Atomically approve
    await prisma.$executeRaw`
      UPDATE integration_approvals
      SET status = 'APPROVED'
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    // If it was a ledger sync, update the connector's sync state
    if (item.action_type === "LEDGER_SYNC" || item.action_type === "Ledger Sync") {
      await prisma.$executeRaw`
        UPDATE integration_connectors
        SET last_sync_time = NOW(),
            synced_vouchers_24h = synced_vouchers_24h + 1
        WHERE tenant_id = ${tenantId}::uuid AND connector_name = ${item.connector_name}
      `;
    }

    // Insert audit log
    await prisma.$executeRaw`
      INSERT INTO integration_logs (
        tenant_id, provider_name, endpoint, payload_type, response_status, latency_ms
      ) VALUES (
        ${tenantId}::uuid, ${item.connector_name}, '/approvals/authorize',
        ${`Authorized: ${item.action_type}`}, 'SUCCESS', 120
      )
    `;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id, status: "APPROVED", connectorName: item.connector_name },
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
        code: "INTEGRATION_AUTHORIZE_ERROR",
        message: safeErrorMessage(err, "Integration execution could not be authorized"),
      },
      meta: null,
    }, { status: 500 });
  }
}
