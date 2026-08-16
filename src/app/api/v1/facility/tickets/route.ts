import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const records = await prisma.maintenanceTicket.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { createdAt: "desc" },
    });

    const mapped = records.map((r) => ({
      id: r.id,
      ticketReference: r.ticketReference,
      ticketSummary: r.ticketSummary,
      propertyLocation: r.propertyLocation,
      category: r.category,
      priority: r.priority,
      slaStatus: r.slaStatus,
      assignedContractor: r.assignedContractor || "",
      status: r.status,
      loggedDate: r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : "",
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
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: [],
        error: {
          code: "TICKETS_FETCH_ERROR",
          message: safeErrorMessage(err, "Maintenance ticket register is temporarily unavailable"),
        },
        meta: { total_records: 0 },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { ticketSummary, propertyLocation, category, priority, assignedContractor } = body;

    if (!ticketSummary || !propertyLocation || !category) {
      return NextResponse.json(
        {
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
        },
        { status: 400 }
      );
    }

    const randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
    const ticketReference = `MT-${Date.now().toString().slice(-4)}-${randomSuffix}`;

    const created = await prisma.maintenanceTicket.create({
      data: {
        tenantId: ACTIVE_TENANT_ID,
        ticketReference,
        ticketSummary: String(ticketSummary).trim(),
        propertyLocation: String(propertyLocation).trim(),
        category: String(category).trim(),
        priority: priority || "Moderate",
        slaStatus: "Within SLA",
        assignedContractor: assignedContractor ? String(assignedContractor).trim() : null,
        status: "OPEN",
      },
    });

    return NextResponse.json(
      {
        success: true,
        status_code: 201,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          id: created.id,
          ticketReference: created.ticketReference,
          ticketSummary: created.ticketSummary,
          propertyLocation: created.propertyLocation,
          category: created.category,
          priority: created.priority,
          slaStatus: created.slaStatus,
          assignedContractor: created.assignedContractor || "",
          status: created.status,
          loggedDate: new Date(created.createdAt).toISOString().split("T")[0],
        },
        error: null,
        meta: null,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "TICKET_CREATE_ERROR",
          message: safeErrorMessage(err, "Maintenance ticket could not be logged"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id, status, slaStatus, assignedContractor } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          status_code: 400,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: { code: "INVALID_ID", message: "Ticket identifier is required" },
          meta: null,
        },
        { status: 400 }
      );
    }

    const dataToUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (status) dataToUpdate.status = status;
    if (slaStatus) dataToUpdate.slaStatus = slaStatus;
    if (assignedContractor !== undefined) dataToUpdate.assignedContractor = assignedContractor;

    const updated = await prisma.maintenanceTicket.updateMany({
      where: {
        id,
        tenantId: ACTIVE_TENANT_ID,
      },
      data: dataToUpdate,
    });

    if (updated.count === 0) {
      return NextResponse.json(
        {
          success: false,
          status_code: 404,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: { code: "NOT_FOUND", message: "Maintenance ticket not found" },
          meta: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { success: true, id, ...dataToUpdate },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "TICKET_UPDATE_ERROR",
          message: safeErrorMessage(err, "Maintenance ticket could not be updated"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
