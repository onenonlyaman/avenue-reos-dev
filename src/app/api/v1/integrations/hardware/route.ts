import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
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
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM hardware_workspace_integrations WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
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
        message: err instanceof Error ? err.message : "Hardware integrations could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}



