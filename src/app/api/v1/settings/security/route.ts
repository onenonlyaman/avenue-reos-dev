import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const model = (prisma as any).securityPolicy;
    let record: any = null;

    if (model?.findFirst) {
      record = await model.findFirst();
      if (!record) {
        record = await model.create({
          data: {
            tenantId: ACTIVE_TENANT_ID,
            mfaEnforced: true,
            whitelistedIpRanges: ["192.168.1.0/24", "10.0.0.0/16"],
            sessionTimeoutMinutes: 30,
            passwordRotationDays: 90,
            superAdminElevationHitl: true,
          },
        });
      }
    } else {
      try {
        await runtimeDdl("table:security_policies", () => prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS security_policies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            mfa_enforced BOOLEAN NOT NULL DEFAULT true,
            whitelisted_ip_ranges TEXT[] NOT NULL DEFAULT ARRAY['192.168.1.0/24'],
            session_timeout_minutes INT NOT NULL DEFAULT 30,
            password_rotation_days INT NOT NULL DEFAULT 90,
            super_admin_elevation_hitl BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM security_policies WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid LIMIT 1
        `;
        if (raw && raw.length > 0) {
          record = raw[0];
        } else {
          const inserted = await prisma.$queryRaw<any[]>`
            INSERT INTO security_policies (
              tenant_id, mfa_enforced, session_timeout_minutes, password_rotation_days
            ) VALUES (
              '00000000-0000-0000-0000-000000000001'::uuid, true, 30, 90
            )
            RETURNING *
          `;
          record = inserted[0];
        }
      } catch {
        record = null;
      }
    }

    if (!record) {
      return NextResponse.json({
        success: true,
        status_code: 200,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: null,
        meta: null,
      });
    }

    const mapped = {
      id: record.id,
      mfaEnforced: Boolean(record.mfaEnforced ?? record.mfa_enforced),
      whitelistedIpRanges: record.whitelistedIpRanges || record.whitelisted_ip_ranges || ["192.168.1.0/24", "10.0.0.0/16"],
      sessionTimeoutMinutes: Number(record.sessionTimeoutMinutes ?? record.session_timeout_minutes ?? 30),
      passwordRotationDays: Number(record.passwordRotationDays ?? record.password_rotation_days ?? 90),
      superAdminElevationHitl: Boolean(record.superAdminElevationHitl ?? record.super_admin_elevation_hitl ?? true),
    };

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
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
        code: "SECURITY_POLICY_FETCH_ERROR",
        message: safeErrorMessage(err, "Security policy settings could not be loaded"),
      },
      meta: null,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { mfaEnforced, whitelistedIpRanges, sessionTimeoutMinutes, passwordRotationDays } = body;
    const tenantId = ACTIVE_TENANT_ID;

    const model = (prisma as any).securityPolicy;
    let upserted: any = null;

    if (model?.upsert) {
      const existing = await model.findFirst();
      if (existing) {
        upserted = await model.update({
          where: { id: existing.id },
          data: {
            mfaEnforced,
            whitelistedIpRanges: whitelistedIpRanges || ["192.168.1.0/24"],
            sessionTimeoutMinutes: sessionTimeoutMinutes || 30,
            passwordRotationDays: passwordRotationDays || 90,
          },
        });
      } else {
        upserted = await model.create({
          data: {
            tenantId,
            mfaEnforced: mfaEnforced ?? true,
            whitelistedIpRanges: whitelistedIpRanges || ["192.168.1.0/24"],
            sessionTimeoutMinutes: sessionTimeoutMinutes || 30,
            passwordRotationDays: passwordRotationDays || 90,
            superAdminElevationHitl: true,
          },
        });
      }
    } else {
      try {
        await runtimeDdl("table:security_policies", () => prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS security_policies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            mfa_enforced BOOLEAN NOT NULL DEFAULT true,
            whitelisted_ip_ranges TEXT[] NOT NULL DEFAULT ARRAY['192.168.1.0/24'],
            session_timeout_minutes INT NOT NULL DEFAULT 30,
            password_rotation_days INT NOT NULL DEFAULT 90,
            super_admin_elevation_hitl BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        const raw = await prisma.$queryRaw<any[]>`SELECT * FROM security_policies WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid LIMIT 1`;
        if (raw && raw.length > 0) {
          const updated = await prisma.$queryRaw<any[]>`
            UPDATE security_policies
            SET mfa_enforced = ${mfaEnforced},
                session_timeout_minutes = ${sessionTimeoutMinutes},
                password_rotation_days = ${passwordRotationDays},
                updated_at = NOW()
            WHERE id = ${raw[0].id}::uuid
            RETURNING *
          `;
          upserted = updated[0];
        } else {
          const inserted = await prisma.$queryRaw<any[]>`
            INSERT INTO security_policies (
              tenant_id, mfa_enforced, session_timeout_minutes, password_rotation_days
            ) VALUES (
              ${tenantId}::uuid, ${mfaEnforced ?? true}, ${sessionTimeoutMinutes || 30}, ${passwordRotationDays || 90}
            )
            RETURNING *
          `;
          upserted = inserted[0];
        }
      } catch (err: unknown) {
        throw new Error(safeErrorMessage(err, "Security policy could not be saved"));
      }
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: upserted.id,
        mfaEnforced: Boolean(upserted.mfaEnforced ?? upserted.mfa_enforced),
        whitelistedIpRanges: upserted.whitelistedIpRanges || upserted.whitelisted_ip_ranges || ["192.168.1.0/24"],
        sessionTimeoutMinutes: Number(upserted.sessionTimeoutMinutes ?? upserted.session_timeout_minutes ?? 30),
        passwordRotationDays: Number(upserted.passwordRotationDays ?? upserted.password_rotation_days ?? 90),
        superAdminElevationHitl: Boolean(upserted.superAdminElevationHitl ?? upserted.super_admin_elevation_hitl ?? true),
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
        code: "SECURITY_POLICY_UPDATE_ERROR",
        message: safeErrorMessage(err, "Security policy settings could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}

