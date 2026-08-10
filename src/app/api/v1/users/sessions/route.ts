import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

async function ensureSessionRegister() {
  await runtimeDdl("table:system_user_sessions", () => prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS system_user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      device_name VARCHAR(255) NOT NULL,
      ip_address VARCHAR(64) NOT NULL,
      is_current_device BOOLEAN NOT NULL DEFAULT false,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSessionRegister();

    const rows = await prisma.$queryRaw<
      { id: string; device_name: string; ip_address: string; is_current_device: boolean; last_active: Date }[]
    >`
      SELECT id, device_name, ip_address, is_current_device, last_active
      FROM system_user_sessions
      WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND status = 'ACTIVE'
      ORDER BY last_active DESC
    `;

    const mapped = (rows || []).map((r) => ({
      id: r.id,
      deviceName: r.device_name,
      ipAddress: r.ip_address,
      lastActiveTimestamp: new Date(r.last_active).toISOString(),
      isCurrentDevice: Boolean(r.is_current_device),
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
        code: "FETCH_SESSIONS_ERROR",
        message: safeErrorMessage(err, "Active device register is temporarily unavailable"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSessionRegister();

    await prisma.$executeRaw`
      UPDATE system_user_sessions
      SET status = 'REVOKED'
      WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND is_current_device = false
    `;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true },
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
        code: "REVOKE_SESSIONS_ERROR",
        message: safeErrorMessage(err, "Device revocation could not be completed"),
      },
      meta: null,
    }, { status: 500 });
  }
}
