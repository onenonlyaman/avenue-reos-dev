import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;

    await runtimeDdl("table:hardware_workspace_integrations", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hardware_workspace_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        integration_name VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
        synced_documents_or_logs INT NOT NULL DEFAULT 0,
        last_sync_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM hardware_workspace_integrations WHERE tenant_id = ${tenantId}::uuid ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      integrationName: r.integration_name,
      category: r.category,
      status: r.status,
      syncedDocumentsOrLogs: Number(r.synced_documents_or_logs || 0),
      lastSyncTimestamp: r.last_sync_timestamp,
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
        code: "HARDWARE_INTEGRATIONS_FETCH_ERROR",
        message: safeErrorMessage(err, "Hardware integrations could not be loaded"),
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
      integrationName,
      category,
      status = "CONNECTED",
      syncedDocumentsOrLogs = 0,
    } = body;

    if (!integrationName || !category) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Hardware device / service name and category are required." },
        meta: null,
      }, { status: 400 });
    }

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO hardware_workspace_integrations (
        tenant_id, integration_name, category, status, synced_documents_or_logs, last_sync_timestamp
      ) VALUES (
        ${tenantId}::uuid,
        ${integrationName.trim()},
        ${category.trim()},
        ${status.trim().toUpperCase()},
        ${Number(syncedDocumentsOrLogs) || 0},
        NOW()
      )
      RETURNING *
    `;

    const r = inserted[0];
    const mapped = {
      id: r.id,
      integrationName: r.integration_name,
      category: r.category,
      status: r.status,
      syncedDocumentsOrLogs: Number(r.synced_documents_or_logs || 0),
      lastSyncTimestamp: r.last_sync_timestamp,
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
        code: "HARDWARE_INTEGRATION_CREATE_ERROR",
        message: safeErrorMessage(err, "Hardware / workspace device integration could not be registered"),
      },
      meta: null,
    }, { status: 500 });
  }
}
