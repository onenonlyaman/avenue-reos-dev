import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { HITL_INTEGRATION_SYNC_LIMIT } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:integration_connectors", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS integration_connectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        connector_name VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
        last_sync_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        synced_vouchers_24h INT NOT NULL DEFAULT 0,
        unreconciled_webhooks INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM integration_connectors WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY connector_name ASC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      connectorName: r.connector_name,
      category: r.category,
      status: r.status,
      lastSyncTime: r.last_sync_time,
      syncedVouchers24h: Number(r.synced_vouchers_24h || 0),
      unreconciledWebhooks: Number(r.unreconciled_webhooks || 0),
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
        code: "CONNECTORS_FETCH_ERROR",
        message: safeErrorMessage(err, "Integration connectors could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const tenantId = ACTIVE_TENANT_ID;

    await runtimeDdl("table:integration_connectors", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS integration_connectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        connector_name VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
        last_sync_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        synced_vouchers_24h INT NOT NULL DEFAULT 0,
        unreconciled_webhooks INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    if (body.action === "MANUAL_SYNC") {
      const { connectorName, amount } = body;
      const syncAmt = Number(amount || 0);
      const requiresHitl = syncAmt > HITL_INTEGRATION_SYNC_LIMIT;

      if (requiresHitl) {
        await runtimeDdl("table:integration_approvals", () => prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS integration_approvals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            connector_name VARCHAR(100) NOT NULL,
            action_type VARCHAR(50) NOT NULL,
            sync_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
            justification TEXT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
            requires_hitl BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await prisma.$executeRaw`
          INSERT INTO integration_approvals (
            tenant_id, connector_name, action_type, sync_amount, justification, status, requires_hitl
          ) VALUES (
            ${tenantId}::uuid, ${connectorName || "Tally Prime Local Bridge"}, 'LEDGER_SYNC',
            ${syncAmt}, 'Manual ERP ledger synchronization exceeds ₹10 Lakhs threshold requirement',
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

      await prisma.$executeRaw`
        UPDATE integration_connectors
        SET last_sync_time = NOW(),
            synced_vouchers_24h = synced_vouchers_24h + 1
        WHERE connector_name = ${connectorName}
      `;

      return NextResponse.json({
        success: true,
        status_code: 200,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: { success: true, requiresHitl: false },
        error: null,
        meta: null,
      });
    }

    const { connectorName, category, status } = body;

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO integration_connectors (
        tenant_id, connector_name, category, status, last_sync_time
      ) VALUES (
        ${tenantId}::uuid, ${connectorName}, ${category || "ERP Sync"}, ${status || "CONNECTED"}, NOW()
      )
      ON CONFLICT (connector_name) DO UPDATE SET
        category = ${category || "ERP Sync"},
        status = ${status || "CONNECTED"},
        last_sync_time = NOW()
      RETURNING *
    `;

    const updated = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: updated.id,
        connectorName: updated.connector_name,
        category: updated.category,
        status: updated.status,
        lastSyncTime: updated.last_sync_time,
        syncedVouchers24h: Number(updated.synced_vouchers_24h || 0),
        unreconciledWebhooks: Number(updated.unreconciled_webhooks || 0),
      },
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
        code: "CONNECTOR_UPDATE_ERROR",
        message: safeErrorMessage(err, "Connector configuration could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}




