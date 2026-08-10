import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM support_tickets WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
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

  try {
    const body = await request.json();
    const { customerName, subject, category, assignedDepartment, priority, claimAmount } = body;
    const tenantId = ACTIVE_TENANT_ID;

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

    const ticketRef = `T-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const amt = Number(claimAmount || 0);
    const isLegalThreat = category === "Legal Notice" || subject.toLowerCase().includes("legal") || subject.toLowerCase().includes("notice");
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO support_tickets (
        tenant_id, ticket_reference, customer_name, subject, category, assigned_department,
        priority, sla_status, status, claim_amount, requires_hitl
      ) VALUES (
        ${tenantId}::uuid, ${ticketRef}, ${customerName}, ${subject}, ${category || "General Inquiry"},
        ${assignedDepartment || "Customer Care"}, ${priority || "STANDARD"}, 'ON_TRACK', ${status},
        ${amt}, ${requiresHitl}
      )
      RETURNING *
    `;

    const created = inserted[0];

    if (requiresHitl) {
      await runtimeDdl("table:communications_approvals", () => prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS communications_approvals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          ticket_reference VARCHAR(100) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          issue_summary TEXT NOT NULL,
          claim_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
          justification TEXT NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
          requires_hitl BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRaw`
        INSERT INTO communications_approvals (
          tenant_id, ticket_reference, customer_name, issue_summary, claim_amount, justification, status, requires_hitl
        ) VALUES (
          ${tenantId}::uuid, ${ticketRef}, ${customerName}, ${subject}, ${amt},
          'Ticket escalation flags financial claim dispute > ₹1 Lakh or legal notice threat requirement',
          'PENDING_APPROVAL', true
        )
      `;
    }

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



