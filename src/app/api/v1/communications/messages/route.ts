import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

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
        SELECT * FROM chat_messages WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND channel_id = ${channelId}::uuid ORDER BY created_at ASC
      `;
    } else {
      raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM chat_messages WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at ASC LIMIT 50
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

  try {
    const body = await request.json();
    const { channelId, senderName, senderRole, content, isPinned, actionLinkUrl, actionLinkLabel } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!channelId || !content) {
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

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO chat_messages (
        tenant_id, channel_id, sender_name, sender_role, content, is_pinned, action_link_url, action_link_label
      ) VALUES (
        ${tenantId}::uuid, ${channelId}::uuid, ${senderName || "System Admin"}, ${senderRole || "Operations Lead"},
        ${content}, ${Boolean(isPinned)}, ${actionLinkUrl || null}, ${actionLinkLabel || null}
      )
      RETURNING *
    `;

    const created = inserted[0];

    await prisma.$executeRaw`
      UPDATE chat_channels
      SET last_activity = NOW()
      WHERE id = ${channelId}::uuid
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



