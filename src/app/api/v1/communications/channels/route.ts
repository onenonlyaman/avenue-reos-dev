import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        channel_name VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        is_private BOOLEAN NOT NULL DEFAULT false,
        member_count INT NOT NULL DEFAULT 1,
        last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM chat_channels WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY last_activity DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      channelName: r.channel_name,
      department: r.department,
      description: r.description,
      isPrivate: Boolean(r.is_private),
      memberCount: Number(r.member_count || 1),
      lastActivity: r.last_activity,
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
        code: "CHANNELS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Chat channels could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelName, department, description, isPrivate } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!channelName || !department) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Channel name and department are required." },
        meta: null,
      });
    }

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        channel_name VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        is_private BOOLEAN NOT NULL DEFAULT false,
        member_count INT NOT NULL DEFAULT 1,
        last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO chat_channels (
        tenant_id, channel_name, department, description, is_private, member_count
      ) VALUES (
        ${tenantId}::uuid, ${channelName}, ${department}, ${description || ""}, ${Boolean(isPrivate)}, 12
      )
      RETURNING *
    `;

    const created = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        channelName: created.channel_name,
        department: created.department,
        description: created.description,
        isPrivate: Boolean(created.is_private),
        memberCount: Number(created.member_count || 1),
        lastActivity: created.last_activity,
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
        code: "CHANNEL_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Channel could not be saved",
      },
      meta: null,
    });
  }
}



