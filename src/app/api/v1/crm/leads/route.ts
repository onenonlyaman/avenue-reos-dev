import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

const DB_TO_UI_STATUS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  SITE_VISIT_SCHEDULED: "Site Visit Scheduled",
  QUALIFIED: "Qualified",
  LOST: "Lost",
  CONVERTED: "Converted",
};

const UI_TO_DB_STATUS: Record<string, string> = {
  New: "NEW",
  Contacted: "CONTACTED",
  "Site Visit Scheduled": "SITE_VISIT_SCHEDULED",
  Qualified: "QUALIFIED",
  Lost: "LOST",
  Converted: "CONVERTED",
};

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.trim() || "";
  const statusParam = searchParams.get("status");
  const sourceParam = searchParams.get("source");

  try {
    const whereClause: import("@prisma/client").Prisma.CrmLeadWhereInput = {
      tenantId: auth.user.tenantId,
    };

    if (statusParam && statusParam !== "All") {
      const dbStatus = UI_TO_DB_STATUS[statusParam] || statusParam.toUpperCase();
      whereClause.status = dbStatus;
    }

    if (sourceParam && sourceParam !== "All") {
      whereClause.leadSource = sourceParam;
    }

    if (search) {
      whereClause.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { leadSource: { contains: search, mode: "insensitive" } },
      ];
    }

    const dbLeads = await prisma.crmLead.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        assignedRep: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    const mapped = dbLeads.map((l) => {
      const history = (l.interactionHistoryJson as Record<string, unknown>) || {};
      const interestedProject = (history.interestedProject as string) || "General Inquiry";
      const unitType = (history.unitType as string) || "Unspecified";
      const assignedRep = l.assignedRep?.fullName || (history.assignedRep as string) || "Unassigned";
      const displayStatus = DB_TO_UI_STATUS[l.status] || l.status;
      const events = Array.isArray(history.events) ? history.events : [];

      const minLakhs = (Number(l.budgetMin) / 100000).toFixed(2);
      const maxLakhs = (Number(l.budgetMax) / 100000).toFixed(2);
      const budgetRange = Number(l.budgetMax) > 0
        ? `₹${minLakhs} L - ₹${maxLakhs} L`
        : `₹${minLakhs} L`;

      return {
        id: l.id,
        name: l.fullName,
        phone: l.phone,
        email: l.email,
        source: l.leadSource,
        interestedProject,
        unitType,
        budgetRange,
        leadScore: l.leadScore ?? 0,
        status: displayStatus,
        assignedRep,
        assignedRepId: l.assignedRepId,
        createdDate: l.createdAt.toISOString().split("T")[0],
        events,
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
        code: "DB_FETCH_LEADS_ERROR",
        message: safeErrorMessage(err, "Prospect register could not be loaded"),
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
    const {
      name,
      email,
      phone,
      source,
      interestedProject,
      unitType,
      budgetMinLakhs,
      budgetMaxLakhs,
      assignedRep,
      assignedRepId,
    } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INVALID_LEAD_DATA",
          message: "Prospect full name and phone number are required",
        },
      }, { status: 400 });
    }

    const minAmt = (Number(budgetMinLakhs) || 0) * 100000;
    const maxAmt = (Number(budgetMaxLakhs) || Number(budgetMinLakhs) || 0) * 100000;

    let matchedRep = null;
    if (assignedRepId) {
      matchedRep = await prisma.masterEmployee.findFirst({
        where: { id: assignedRepId, tenantId: auth.user.tenantId, status: "ACTIVE" },
      });
    } else if (assignedRep && assignedRep !== "Unassigned") {
      matchedRep = await prisma.masterEmployee.findFirst({
        where: { fullName: assignedRep, tenantId: auth.user.tenantId, status: "ACTIVE" },
      });
    }

    const randomSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const leadCode = `LD-${randomSuffix}`;

    const initialEvent = {
      id: `EV-${Date.now()}`,
      stage: "Inquiry Log",
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      actor: auth.user.fullName || "System",
      description: `Prospect profile recorded via ${source || "Manual Ingestion"}. Interested in ${interestedProject || "Development Project"}.`,
      completed: true,
    };

    const created = await prisma.crmLead.create({
      data: {
        tenantId: auth.user.tenantId,
        leadCode,
        fullName: name.trim(),
        email: email?.trim() || "",
        phone: phone.trim(),
        leadSource: source || "Web Form",
        budgetMin: minAmt,
        budgetMax: maxAmt >= minAmt ? maxAmt : minAmt,
        status: "NEW",
        leadScore: 50,
        assignedRepId: matchedRep ? matchedRep.id : null,
        interactionHistoryJson: {
          interestedProject: interestedProject || "",
          unitType: unitType || "",
          assignedRep: matchedRep ? matchedRep.fullName : (assignedRep || "Unassigned"),
          events: [initialEvent],
        },
      },
      include: {
        assignedRep: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const displayBudgetRange = Number(created.budgetMax) > 0
      ? `₹${(Number(created.budgetMin) / 100000).toFixed(2)} L - ₹${(Number(created.budgetMax) / 100000).toFixed(2)} L`
      : `₹${(Number(created.budgetMin) / 100000).toFixed(2)} L`;

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        name: created.fullName,
        phone: created.phone,
        email: created.email,
        source: created.leadSource,
        interestedProject: interestedProject || "",
        unitType: unitType || "",
        budgetRange: displayBudgetRange,
        leadScore: created.leadScore || 50,
        status: "New",
        assignedRep: created.assignedRep?.fullName || "Unassigned",
        createdDate: created.createdAt.toISOString().split("T")[0],
        events: [initialEvent],
      },
      error: null,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "DB_CREATE_LEAD_ERROR",
        message: safeErrorMessage(err, "Prospect could not be saved"),
      },
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { leadId, action, logEntry, status, score } = body;

    if (!leadId) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_LEAD_ID", message: "leadId is required" },
      }, { status: 400 });
    }

    const existingLead = await prisma.crmLead.findFirst({
      where: { id: leadId, tenantId: auth.user.tenantId },
    });

    if (!existingLead) {
      return NextResponse.json({
        success: false,
        status_code: 404,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "LEAD_NOT_FOUND", message: "Lead record not found" },
      }, { status: 404 });
    }

    const currentHistory = (existingLead.interactionHistoryJson as Record<string, unknown>) || {};
    const currentEvents = Array.isArray(currentHistory.events) ? [...currentHistory.events] : [];

    if (action === "LOG_ACTIVITY" && logEntry) {
      const newEvent = {
        id: `EV-${Date.now()}`,
        stage: logEntry.stage || "Call Summary",
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
        actor: auth.user.fullName || "Sales Rep",
        description: logEntry.description || "",
        completed: true,
      };
      currentEvents.unshift(newEvent);

      const updateData: import("@prisma/client").Prisma.CrmLeadUpdateInput = {
        interactionHistoryJson: {
          ...currentHistory,
          events: currentEvents,
        },
      };

      if (logEntry.nextStatus) {
        const dbStatus = UI_TO_DB_STATUS[logEntry.nextStatus] || logEntry.nextStatus.toUpperCase();
        updateData.status = dbStatus;
      }

      const updated = await prisma.crmLead.update({
        where: { id: leadId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        status_code: 200,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          id: updated.id,
          status: DB_TO_UI_STATUS[updated.status] || updated.status,
          events: currentEvents,
        },
        error: null,
      });
    }

    if (status) {
      const dbStatus = UI_TO_DB_STATUS[status] || status.toUpperCase();
      const updated = await prisma.crmLead.update({
        where: { id: leadId },
        data: { status: dbStatus },
      });

      return NextResponse.json({
        success: true,
        status_code: 200,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          id: updated.id,
          status: DB_TO_UI_STATUS[updated.status] || updated.status,
        },
        error: null,
      });
    }

    if (score !== undefined) {
      const updated = await prisma.crmLead.update({
        where: { id: leadId },
        data: { leadScore: Number(score) },
      });

      return NextResponse.json({
        success: true,
        status_code: 200,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          id: updated.id,
          leadScore: updated.leadScore,
        },
        error: null,
      });
    }

    return NextResponse.json({
      success: false,
      status_code: 400,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: { code: "NO_UPDATE_OPERATION", message: "No valid update operation provided" },
    }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "LEAD_UPDATE_ERROR",
        message: safeErrorMessage(err, "Lead could not be updated"),
      },
    }, { status: 500 });
  }
}
