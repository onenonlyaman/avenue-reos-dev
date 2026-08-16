import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage, envelope } from "@/lib/apiAccess";
import { ensureNotificationSchema, SystemNotificationRecord } from "@/lib/notifications/ensureNotificationSchema";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = typeof auth === "object" && auth.user?.tenantId ? auth.user.tenantId : ACTIVE_TENANT_ID;
  const userRole = typeof auth === "object" && auth.user?.role ? auth.user.role : "ALL";

  try {
    await ensureNotificationSchema(tenantId);

    const notifications = await prisma.$queryRaw<SystemNotificationRecord[]>`
      SELECT id, timestamp, src_module, user_type, type, description, action_link, priority, is_read, tenant_id, created_at, updated_at
      FROM notification.system_notifications
      WHERE tenant_id = ${tenantId}::uuid
        AND (user_type = 'ALL' OR user_type = ${userRole})
      ORDER BY timestamp DESC
      LIMIT 50
    `;

    return envelope(200, {
      data: notifications,
      meta: {
        total: notifications.length,
        unread_count: notifications.filter((n) => !n.is_read).length,
      },
    });
  } catch (err: unknown) {
    return envelope(500, {
      error: {
        code: "NOTIFICATION_FETCH_FAILED",
        message: safeErrorMessage(err, "Unable to load notifications"),
      },
    });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = typeof auth === "object" && auth.user?.tenantId ? auth.user.tenantId : ACTIVE_TENANT_ID;

  try {
    await ensureNotificationSchema(tenantId);

    const body = await request.json();
    const { id, is_read = true } = body;

    if (!id) {
      return envelope(400, {
        error: {
          code: "INVALID_NOTIFICATION_ID",
          message: "Notification identifier is required",
        },
      });
    }

    await prisma.$executeRaw`
      UPDATE notification.system_notifications
      SET is_read = ${Boolean(is_read)}, updated_at = NOW()
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return envelope(200, {
      data: { id, is_read: Boolean(is_read), updated_at: new Date().toISOString() },
    });
  } catch (err: unknown) {
    return envelope(500, {
      error: {
        code: "NOTIFICATION_UPDATE_FAILED",
        message: safeErrorMessage(err, "Unable to update notification status"),
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = typeof auth === "object" && auth.user?.tenantId ? auth.user.tenantId : ACTIVE_TENANT_ID;

  try {
    await ensureNotificationSchema(tenantId);

    const body = await request.json();

    if (body.action === "mark_all_read") {
      await prisma.$executeRaw`
        UPDATE notification.system_notifications
        SET is_read = true, updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid AND is_read = false
      `;

      return envelope(200, {
        data: { success: true, message: "All notifications marked as read" },
      });
    }

    const {
      src_module,
      user_type = "ALL",
      type = "INFO",
      description,
      action_link = "/",
      priority = "MEDIUM",
    } = body;

    if (!src_module || !description) {
      return envelope(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "src_module and description are required fields",
        },
      });
    }

    const inserted = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO notification.system_notifications (
        tenant_id, src_module, user_type, type, description, action_link, priority, is_read, timestamp
      ) VALUES (
        ${tenantId}::uuid, ${src_module}, ${user_type}, ${type}, ${description}, ${action_link}, ${priority}, false, NOW()
      )
      RETURNING id
    `;

    return envelope(201, {
      data: { id: inserted[0]?.id, message: "Notification created successfully" },
    });
  } catch (err: unknown) {
    return envelope(500, {
      error: {
        code: "NOTIFICATION_CREATION_FAILED",
        message: safeErrorMessage(err, "Failed to create notification"),
      },
    });
  }
}
