import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const scope = searchParams.get("scope") || "all";
    const searchLower = q.toLowerCase().trim();

    const modules = [
      { name: "CRM & Sales Operations", href: "/crm", desc: "Customer leads, unit bookings, demand notes" },
      { name: "Finance & Accounting Ledger", href: "/finance", desc: "Chart of accounts, cash flow, disbursements" },
      { name: "Construction & DPR Site Feeds", href: "/construction", desc: "WBS schedule, RA bills, site inspections" },
      { name: "Procurement & Inventory Engine", href: "/procurement", desc: "Purchase orders, GRN, vendor ratings" },
      { name: "Property & Facility Management", href: "/facility", desc: "CAM invoices, asset tags, handover keys" },
      { name: "Land & Regulatory Legal Vault", href: "/legal", desc: "JDA deeds, title searches, RERA filings" },
      { name: "HR & Payroll Engine", href: "/hr", desc: "Employee directory, biometrics, statutory PF" },
      { name: "Team Communications & Support", href: "/communications", desc: "WhatsApp dispatches, IVR calls, tickets" },
      { name: "Executive Analytics & IRR", href: "/analytics", desc: "Valuation, liquidity risk, IRR models" },
      { name: "AI Agent Governance (MCP)", href: "/mcp", desc: "Registered tools, agent sessions, audit logs" },
      { name: "Domain AI Microservices", href: "/ai-intelligence", desc: "MOM reports, CCTV safety, commodity advisor" },
      { name: "External Systems & ERP Sync", href: "/integrations", desc: "Tally Prime, SAP bridge, Razorpay gateway" },
      { name: "Administrative User Directory", href: "/users", desc: "RBAC permission matrix, user directory" },
      { name: "Security & User Profile", href: "/profile", desc: "Password controls, active device sessions" },
      { name: "System Administration & Security", href: "/settings", desc: "Tenant profile, RBAC matrix, audit trail" },
      { name: "System Diagnostics & Event Stream", href: "/system-status", desc: "Platform health status, JetStream events" },
    ];

    let results: any[] = [];

    if (scope === "all" || scope === "modules") {
      const filteredModules = modules.filter(
        (m) => !searchLower || m.name.toLowerCase().includes(searchLower) || m.desc.toLowerCase().includes(searchLower)
      );

      results.push(
        ...filteredModules.map((m) => ({
          id: `mod-${m.href.replace("/", "") || "home"}`,
          title: m.name,
          subtitle: m.desc,
          category: "MODULE",
          href: m.href,
          detailPayload: {
            entityType: "Platform Module",
            entityName: m.name,
            status: "OPERATIONAL",
            metadata: { description: m.desc, route: m.href },
          },
        }))
      );
    }

    if (scope === "all" || scope === "records") {
      let bookings: any[] = [];
      try {
        bookings = await prisma.$queryRaw<any[]>`
          SELECT b.id, b.status, b.agreed_total_price AS booking_amount,
                 c.full_name AS customer_name,
                 CONCAT(u.tower_name, ' - Unit ', u.unit_number) AS unit_name,
                 p.project_name
          FROM sales_bookings b
          LEFT JOIN master_customer c ON b.customer_id = c.id
          LEFT JOIN master_unit u ON b.unit_id = u.id
          LEFT JOIN master_project p ON u.project_id = p.id
          WHERE b.tenant_id = ${ACTIVE_TENANT_ID}::uuid
          ORDER BY b.created_at DESC LIMIT 10
        `;
      } catch {}

      for (const b of bookings || []) {
        if (!searchLower || (b.customer_name && b.customer_name.toLowerCase().includes(searchLower)) || (b.unit_name && b.unit_name.toLowerCase().includes(searchLower))) {
          results.push({
            id: `rec-booking-${b.id}`,
            title: `Unit Booking: ${b.unit_name || "Unit"}`,
            subtitle: `Customer: ${b.customer_name} • Booking Amount: ₹${Number(b.booking_amount || 0).toLocaleString("en-IN")}`,
            category: "RECORD",
            href: "/crm",
            detailPayload: {
              entityType: "Sales Booking Record",
              entityName: `${b.unit_name} — ${b.customer_name}`,
              status: b.status || "CONFIRMED",
              metadata: {
                customerName: b.customer_name,
                unitName: b.unit_name,
                bookingAmount: Number(b.booking_amount || 0),
                projectName: b.project_name || "",
              },
            },
          });
        }
      }

      let raBills: any[] = [];
      try {
        raBills = await prisma.$queryRaw<any[]>`
          SELECT id, bill_reference AS bill_number, contractor_name, status, wbs_phase,
                 gross_claim_amount AS claimed_amount
          FROM contractor_ra_bills
          WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid
          ORDER BY created_at DESC LIMIT 10
        `;
      } catch {}

      for (const bill of raBills || []) {
        if (!searchLower || (bill.bill_number && bill.bill_number.toLowerCase().includes(searchLower)) || (bill.contractor_name && bill.contractor_name.toLowerCase().includes(searchLower))) {
          results.push({
            id: `rec-rabill-${bill.id}`,
            title: `Contractor Invoice #${bill.bill_number || ""}`,
            subtitle: `Contractor: ${bill.contractor_name} • Claimed: ₹${Number(bill.claimed_amount || 0).toLocaleString("en-IN")}`,
            category: "RECORD",
            href: "/construction",
            detailPayload: {
              entityType: "Construction RA Bill",
              entityName: bill.bill_number,
              status: bill.status || "PENDING_VERIFICATION",
              metadata: {
                contractorName: bill.contractor_name,
                claimedAmount: Number(bill.claimed_amount || 0),
                workPackage: bill.wbs_phase || "",
              },
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: results,
      error: null,
      meta: { total_records: results.length },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: [],
      error: {
        code: "SEARCH_EXECUTION_ERROR",
        message: safeErrorMessage(err, "Search could not be completed"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}




