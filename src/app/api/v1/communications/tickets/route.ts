import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, AuthenticatedContext, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth as AuthenticatedContext;
  const tenantId = user.tenantId;

  try {
    await runtimeDdl("table:support_tickets", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        ticket_reference VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        assigned_department VARCHAR(100) NOT NULL,
        priority VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
        sla_status VARCHAR(50) NOT NULL DEFAULT 'ON_TRACK',
        status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
        claim_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM support_tickets
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      ticketReference: r.ticket_reference,
      customerName: r.customer_name,
      subject: r.subject,
      category: r.category,
      assignedDepartment: r.assigned_department,
      priority: r.priority,
      slaStatus: r.sla_status,
      status: r.status,
      claimAmount: Number(r.claim_amount || 0),
      requiresHitl: Boolean(r.requires_hitl),
      createdAt: r.created_at,
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
        code: "TICKETS_FETCH_ERROR",
        message: safeErrorMessage(err, "Support tickets could not be loaded"),
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
    const { customerName, subject, category, assignedDepartment, priority, claimAmount } = body;

    if (!customerName || !subject) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Customer name and subject are required." },
        meta: null,
      }, { status: 400 });
    }

    const uniqueSuffix = `${Date.now().toString(36).slice(-4).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
    const ticketRef = `T-2026-${uniqueSuffix}`;
    const amt = Number(claimAmount || 0);
    const isLegalThreat =
      category === "Legal Notice" ||
      subject.toLowerCase().includes("legal") ||
      subject.toLowerCase().includes("notice") ||
      subject.toLowerCase().includes("rera");
    const requiresHitl = amt > 100000 || isLegalThreat;
    const status = requiresHitl ? "PENDING_APPROVAL" : "OPEN";

    await runtimeDdl("table:support_tickets", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        ticket_reference VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        assigned_department VARCHAR(100) NOT NULL,
        priority VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
        sla_status VARCHAR(50) NOT NULL DEFAULT 'ON_TRACK',
        status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
        claim_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await runtimeDdl("table:communications_approvals", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS communications_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        ticket_reference VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        issue_summary TEXT NOT NULL,
        claim_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        justification TEXT NOT NULL,
        rejection_reason TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        requires_hitl BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await runtimeDdl("table:customer_timelines", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS customer_timelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        unit_number VARCHAR(100) NOT NULL,
        interaction_type VARCHAR(100) NOT NULL,
        summary TEXT NOT NULL,
        officer_name VARCHAR(255) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const created = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<any[]>`
        INSERT INTO support_tickets (
          tenant_id, ticket_reference, customer_name, subject, category, assigned_department,
          priority, sla_status, status, claim_amount, requires_hitl, created_at, updated_at
        ) VALUES (
          ${tenantId}::uuid, ${ticketRef}, ${customerName}, ${subject}, ${category || "General Inquiry"},
          ${assignedDepartment || "Customer Care"}, ${priority || "STANDARD"}, 'ON_TRACK', ${status},
          ${amt}, ${requiresHitl}, NOW(), NOW()
        )
        RETURNING *
      `;

      const tkt = inserted[0];

      if (requiresHitl) {
        await tx.$executeRaw`
          INSERT INTO communications_approvals (
            tenant_id, ticket_reference, customer_name, issue_summary, claim_amount, justification, status, requires_hitl, created_at, updated_at
          ) VALUES (
            ${tenantId}::uuid, ${ticketRef}, ${customerName}, ${subject}, ${amt},
            'Ticket escalation flags financial claim dispute > ₹1 Lakh or legal notice threat requirement',
            'PENDING_APPROVAL', true, NOW(), NOW()
          )
        `;
      }

      await tx.$executeRaw`
        INSERT INTO customer_timelines (
          tenant_id, customer_name, unit_number, interaction_type, summary, officer_name, timestamp
        ) VALUES (
          ${tenantId}::uuid,
          ${customerName},
          ${category || "Support Desk"},
          ${isLegalThreat ? "Legal Escalation" : "Support Ticket"},
          ${`Raised Ticket [${ticketRef}]: ${subject} (Priority: ${priority || "STANDARD"})`},
          ${user.fullName || "Support Officer"},
          NOW()
        )
      `;

      return tkt;
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        ticketReference: created.ticket_reference,
        customerName: created.customer_name,
        subject: created.subject,
        category: created.category,
        assignedDepartment: created.assigned_department,
        priority: created.priority,
        slaStatus: created.sla_status,
        status: created.status,
        claimAmount: Number(created.claim_amount || 0),
        requiresHitl: Boolean(created.requires_hitl),
        createdAt: created.created_at,
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
        code: "TICKET_CREATE_ERROR",
        message: safeErrorMessage(err, "Support ticket could not be saved"),
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
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Ticket ID and new status are required." },
        meta: null,
      }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const tickets = await tx.$queryRaw<any[]>`
        UPDATE support_tickets
        SET status = ${status},
            updated_at = NOW()
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        RETURNING *
      `;

      if (!tickets || tickets.length === 0) {
        throw new Error("Support ticket not found.");
      }

      const tkt = tickets[0];

      await tx.$executeRaw`
        INSERT INTO customer_timelines (
          tenant_id, customer_name, unit_number, interaction_type, summary, officer_name, timestamp
        ) VALUES (
          ${tenantId}::uuid,
          ${tkt.customer_name},
          ${tkt.category || "Support Desk"},
          'Support Ticket',
          ${`Ticket [${tkt.ticket_reference}] status changed to ${status}`},
          ${user.fullName || "Support Officer"},
          NOW()
        )
      `;

      return tkt;
    });

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: updated.id,
        ticketReference: updated.ticket_reference,
        customerName: updated.customer_name,
        subject: updated.subject,
        category: updated.category,
        assignedDepartment: updated.assigned_department,
        priority: updated.priority,
        slaStatus: updated.sla_status,
        status: updated.status,
        claimAmount: Number(updated.claim_amount || 0),
        requiresHitl: Boolean(updated.requires_hitl),
        createdAt: updated.created_at,
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
        code: "TICKET_UPDATE_ERROR",
        message: safeErrorMessage(err, "Ticket status could not be updated"),
      },
      meta: null,
    }, { status: 500 });
  }
}
