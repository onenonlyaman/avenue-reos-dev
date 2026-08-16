import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, AuthenticatedContext, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth as AuthenticatedContext;
  const tenantId = user.tenantId;

  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    await runtimeDdl("table:chat_messages", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        channel_id UUID NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        sender_role VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        is_pinned BOOLEAN NOT NULL DEFAULT false,
        action_link_url TEXT,
        action_link_label TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    let raw: any[] = [];
    if (channelId) {
      raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM chat_messages
        WHERE tenant_id = ${tenantId}::uuid AND channel_id = ${channelId}::uuid
        ORDER BY created_at ASC
      `;
    } else {
      raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM chat_messages
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY created_at ASC
        LIMIT 100
      `;
    }

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      channelId: r.channel_id,
      senderName: r.sender_name,
      senderRole: r.sender_role,
      content: r.content,
      timestamp: r.created_at,
      isPinned: Boolean(r.is_pinned),
      actionLinkUrl: r.action_link_url || undefined,
      actionLinkLabel: r.action_link_label || undefined,
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
        code: "MESSAGES_FETCH_ERROR",
        message: safeErrorMessage(err, "Messages could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth as AuthenticatedContext;
  const tenantId = user.tenantId;

  try {
    const body = await request.json();
    const { channelId, content, isPinned, actionLinkUrl, actionLinkLabel } = body;

    if (!channelId || !content || !content.trim()) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Channel ID and message content are required." },
        meta: null,
      }, { status: 400 });
    }

    await runtimeDdl("table:chat_messages", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        channel_id UUID NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        sender_role VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        is_pinned BOOLEAN NOT NULL DEFAULT false,
        action_link_url TEXT,
        action_link_label TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const senderName = user.fullName || body.senderName || "Enterprise User";
    const senderRole = user.role || body.senderRole || "Staff";

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO chat_messages (
        tenant_id, channel_id, sender_name, sender_role, content, is_pinned, action_link_url, action_link_label, created_at
      ) VALUES (
        ${tenantId}::uuid, ${channelId}::uuid, ${senderName}, ${senderRole},
        ${content.trim()}, ${Boolean(isPinned)}, ${actionLinkUrl || null}, ${actionLinkLabel || null}, NOW()
      )
      RETURNING *
    `;

    const created = inserted[0];

    await prisma.$executeRaw`
      UPDATE chat_channels
      SET last_activity = NOW()
      WHERE id = ${channelId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        channelId: created.channel_id,
        senderName: created.sender_name,
        senderRole: created.sender_role,
        content: created.content,
        timestamp: created.created_at,
        isPinned: Boolean(created.is_pinned),
        actionLinkUrl: created.action_link_url || undefined,
        actionLinkLabel: created.action_link_label || undefined,
      },
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
        code: "MESSAGE_SEND_ERROR",
        message: safeErrorMessage(err, "Message could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth as AuthenticatedContext;
  const tenantId = user.tenantId;

  try {
    const body = await request.json();
    const { messageId, isPinned } = body;

    if (!messageId) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_ID", message: "Message ID is required." },
        meta: null,
      }, { status: 400 });
    }

    const updated = await prisma.$queryRaw<any[]>`
      UPDATE chat_messages
      SET is_pinned = ${Boolean(isPinned)}
      WHERE id = ${messageId}::uuid AND tenant_id = ${tenantId}::uuid
      RETURNING *
    `;

    if (!updated || updated.length === 0) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MESSAGE_NOT_FOUND", message: "Message could not be found." },
        meta: null,
      }, { status: 404 });
    }

    const item = updated[0];

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: item.id,
        channelId: item.channel_id,
        senderName: item.sender_name,
        senderRole: item.sender_role,
        content: item.content,
        timestamp: item.created_at,
        isPinned: Boolean(item.is_pinned),
        actionLinkUrl: item.action_link_url || undefined,
        actionLinkLabel: item.action_link_label || undefined,
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
        code: "MESSAGE_PIN_ERROR",
        message: safeErrorMessage(err, "Message pin status could not be changed"),
      },
      meta: null,
    }, { status: 500 });
  }
}
