import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

async function ensureMaintenanceTicketRegister() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS maintenance_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      ticket_reference VARCHAR(100) NOT NULL,
      ticket_summary VARCHAR(500) NOT NULL,
      property_location VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      priority VARCHAR(50) NOT NULL DEFAULT 'Moderate',
      sla_status VARCHAR(50) NOT NULL DEFAULT 'Within SLA',
      assigned_contractor VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    const model = (prisma as any).maintenanceTicket;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { tenantId: ACTIVE_TENANT_ID },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        await ensureMaintenanceTicketRegister();
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM maintenance_tickets WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => {
      const loggedAt = r.createdAt || r.created_at;
      return {
        id: r.id,
        ticketReference: r.ticketReference || r.ticket_reference || "",
        ticketSummary: r.ticketSummary || r.ticket_summary || "",
        propertyLocation: r.propertyLocation || r.property_location || "",
        category: r.category || "",
        priority: r.priority || "Moderate",
        slaStatus: r.slaStatus || r.sla_status || "Within SLA",
        assignedContractor: r.assignedContractor || r.assigned_contractor || "",
        status: r.status || "OPEN",
        loggedDate: loggedAt ? new Date(loggedAt).toISOString().split("T")[0] : "",
      };
    });

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
        message: err instanceof Error ? err.message : "Maintenance ticket register is temporarily unavailable",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketSummary, propertyLocation, category, priority, assignedContractor } = body;

    if (!ticketSummary || !propertyLocation || !category) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_TICKET_RECORD",
          message: "Ticket summary, property location and category are required",
        },
        meta: null,
      });
    }

    await ensureMaintenanceTicketRegister();

    const ticketReference = `MT-${Date.now().toString().slice(-6)}`;

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO maintenance_tickets (
        tenant_id, ticket_reference, ticket_summary, property_location, category, priority, assigned_contractor
      ) VALUES (
        ${ACTIVE_TENANT_ID}::uuid, ${ticketReference}, ${ticketSummary}, ${propertyLocation}, ${category},
        ${priority || "Moderate"}, ${assignedContractor || null}
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
        ticketReference: created.ticket_reference,
        ticketSummary: created.ticket_summary,
        propertyLocation: created.property_location,
        category: created.category,
        priority: created.priority,
        slaStatus: created.sla_status,
        assignedContractor: created.assigned_contractor || "",
        status: created.status,
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
        code: "TICKET_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Maintenance ticket could not be logged",
      },
      meta: null,
    });
  }
}
