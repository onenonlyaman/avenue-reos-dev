import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const model = (prisma as any).systemRolePermission;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({ where: { tenantId: ACTIVE_TENANT_ID } });
    } else {
      try {
        await runtimeDdl("table:system_role_permissions", () => prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS system_role_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            role_name VARCHAR(100) UNIQUE NOT NULL,
            can_read BOOLEAN NOT NULL DEFAULT true,
            can_create BOOLEAN NOT NULL DEFAULT false,
            can_update BOOLEAN NOT NULL DEFAULT false,
            can_delete BOOLEAN NOT NULL DEFAULT false,
            can_authorize_hitl BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM system_role_permissions WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      roleName: r.roleName || r.role_name || "",
      canRead: Boolean(r.canRead ?? r.can_read),
      canCreate: Boolean(r.canCreate ?? r.can_create),
      canUpdate: Boolean(r.canUpdate ?? r.can_update),
      canDelete: Boolean(r.canDelete ?? r.can_delete),
      canAuthorizeHitl: Boolean(r.canAuthorizeHitl ?? r.can_authorize_hitl),
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
        code: "ROLES_FETCH_ERROR",
        message: safeErrorMessage(err, "Role permission register is temporarily unavailable"),
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
    const { roleName, canRead, canCreate, canUpdate, canDelete, canAuthorizeHitl } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!roleName) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_ROLE_NAME", message: "Role name is required" },
        meta: null,
      }, { status: 400 });
    }

    const model = (prisma as any).systemRolePermission;
    if (model?.upsert) {
      await model.upsert({
        where: { roleName },
        update: { canRead, canCreate, canUpdate, canDelete, canAuthorizeHitl },
        create: { tenantId, roleName, canRead, canCreate, canUpdate, canDelete, canAuthorizeHitl },
      });
    } else {
      try {
        await runtimeDdl("table:system_role_permissions", () => prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS system_role_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            role_name VARCHAR(100) UNIQUE NOT NULL,
            can_read BOOLEAN NOT NULL DEFAULT true,
            can_create BOOLEAN NOT NULL DEFAULT false,
            can_update BOOLEAN NOT NULL DEFAULT false,
            can_delete BOOLEAN NOT NULL DEFAULT false,
            can_authorize_hitl BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await prisma.$executeRaw`
          INSERT INTO system_role_permissions (
            tenant_id, role_name, can_read, can_create, can_update, can_delete, can_authorize_hitl
          ) VALUES (
            ${tenantId}::uuid, ${roleName}, ${canRead}, ${canCreate}, ${canUpdate}, ${canDelete}, ${canAuthorizeHitl}
          )
          ON CONFLICT (role_name) DO UPDATE SET
            can_read = ${canRead},
            can_create = ${canCreate},
            can_update = ${canUpdate},
            can_delete = ${canDelete},
            can_authorize_hitl = ${canAuthorizeHitl},
            updated_at = NOW()
        `;
      } catch (err: unknown) {
        throw new Error(safeErrorMessage(err, "Role permission could not be saved"));
      }
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { roleName, canRead, canCreate, canUpdate, canDelete, canAuthorizeHitl },
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
        code: "ROLE_UPDATE_ERROR",
        message: safeErrorMessage(err, "Role permission could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}


