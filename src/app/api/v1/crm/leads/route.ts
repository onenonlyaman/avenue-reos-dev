import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.toLowerCase() || "";
  const status = searchParams.get("status");
  const source = searchParams.get("source");

  try {
    const dbLeads = await prisma.crmLead.findMany({ where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { createdAt: "desc" },
      include: {
        assignedRep: {
          select: {
            fullName: true,
          },
        },
      },
    });

    let mapped = dbLeads.map((l) => {
      const history = (l.interactionHistoryJson as Record<string, unknown>) || {};
      const interestedProject = (history.interestedProject as string) || "Avenue Horizon - Gangapur Road";
      const unitType = (history.unitType as string) || "3 BHK Executive Suite";
      const assignedRep = l.assignedRep?.fullName || (history.assignedRep as string) || "Anand Verma";

      return {
        id: l.id,
        name: l.fullName,
        phone: l.phone,
        email: l.email,
        source: l.leadSource,
        interestedProject,
        unitType,
        budgetRange: `₹${(Number(l.budgetMin) / 100000).toFixed(2)} Lakhs - ₹${(Number(l.budgetMax) / 100000).toFixed(2)} Lakhs`,
        leadScore: l.leadScore || 50,
        status: l.status === "NEW" ? "New" : l.status === "CONTACTED" ? "Contacted" : l.status === "SITE_VISIT" ? "Site Visit Scheduled" : l.status === "QUALIFIED" ? "Qualified" : l.status,
        assignedRep,
        createdDate: l.createdAt.toISOString().split("T")[0],
      };
    });

    if (search) {
      mapped = mapped.filter(
        (l) =>
          l.name.toLowerCase().includes(search) ||
          l.phone.includes(search) ||
          l.email.toLowerCase().includes(search) ||
          l.source.toLowerCase().includes(search) ||
          l.interestedProject.toLowerCase().includes(search)
      );
    }

    if (status && status !== "All") {
      mapped = mapped.filter((l) => l.status === status);
    }

    if (source && source !== "All") {
      mapped = mapped.filter((l) => l.source === source);
    }

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
        message: err instanceof Error ? err.message : "Prospect register could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
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
  } = body;

  const minAmt = (Number(budgetMinLakhs) || 50) * 100000;
  const maxAmt = (Number(budgetMaxLakhs) || 100) * 100000;

  try {
    const created = await prisma.crmLead.create({
      data: {
        tenantId: ACTIVE_TENANT_ID,
        leadCode: `LD-${Math.floor(9000 + Math.random() * 1000)}`,
        fullName: name || "New Prospect",
        email: email || "prospect@avenue.in",
        phone: phone || "+91 98000 00000",
        leadSource: source || "Web Form",
        budgetMin: minAmt,
        budgetMax: maxAmt,
        status: "NEW",
        leadScore: 50,
        interactionHistoryJson: {
          interestedProject: interestedProject || "Avenue Horizon - Gangapur Road",
          unitType: unitType || "3 BHK Executive Suite",
          assignedRep: assignedRep || "Anand Verma",
        },
      },
    });

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
        interestedProject: interestedProject || "Avenue Horizon - Gangapur Road",
        unitType: unitType || "3 BHK Executive Suite",
        budgetRange: `₹${(Number(created.budgetMin) / 100000).toFixed(2)} Lakhs - ₹${(Number(created.budgetMax) / 100000).toFixed(2)} Lakhs`,
        leadScore: created.leadScore || 50,
        status: "New",
        assignedRep: assignedRep || "Anand Verma",
        createdDate: created.createdAt.toISOString().split("T")[0],
      },
      error: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "DB_CREATE_LEAD_ERROR",
        message: err instanceof Error ? err.message : "Prospect could not be saved",
      },
    });
  }
}
