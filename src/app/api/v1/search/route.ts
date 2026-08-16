import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage, envelope } from "@/lib/apiAccess";
import { isRouteAllowedForRole } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = typeof auth === "object" && auth.user?.tenantId ? auth.user.tenantId : ACTIVE_TENANT_ID;
  const userRole = typeof auth === "object" && auth.user?.role ? auth.user.role : null;

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const scope = searchParams.get("scope") || "all";
    const searchPattern = `%${q}%`;

    const allPlatformModules = [
      { name: "CRM & Sales Operations", href: "/crm", desc: "Customer leads, unit bookings, payment schedules, demand notes" },
      { name: "Finance & Accounting Ledger", href: "/finance", desc: "Chart of accounts, cash flow statements, vendor disbursements" },
      { name: "Tally ERP Subsystem", href: "/finance/tally", desc: "Chart of accounts, vouchers, ledger sync, aging reports" },
      { name: "Construction & DPR Site Feeds", href: "/construction", desc: "WBS schedule, RA bills, daily progress reports, site inspections" },
      { name: "Procurement & Inventory Engine", href: "/procurement", desc: "Purchase orders, material requisitions, GRN, vendor ratings" },
      { name: "Property & Facility Management", href: "/facility", desc: "CAM invoices, asset inventory, utility submeters, maintenance tickets" },
      { name: "Land & Regulatory Legal Vault", href: "/legal", desc: "JDA deeds, title certificates, 7/12 extracts, RERA filings" },
      { name: "HR & Payroll Engine", href: "/hr", desc: "Employee directory, attendance, biometric punch, statutory PF" },
      { name: "Team Communications & Support", href: "/communications", desc: "Project broadcast channels, IVR tickets, field dispatches" },
      { name: "Executive Analytics & IRR", href: "/analytics", desc: "Project valuation, liquidity forecasts, cost center variance" },
      { name: "AI Agent Governance (MCP)", href: "/mcp", desc: "Registered tools, agent sessions, security execution logs" },
      { name: "Domain AI Microservices", href: "/ai-intelligence", desc: "MOM summarization, CCTV safety compliance, commodity advisor" },
      { name: "External Systems & ERP Sync", href: "/integrations", desc: "Tally Prime connector, SAP bridge, Razorpay payment gateway" },
      { name: "Administrative User Directory", href: "/users", desc: "RBAC permission matrix, user directory, access controls" },
      { name: "Security & User Profile", href: "/profile", desc: "Password controls, active sessions, profile details" },
      { name: "System Administration & Security", href: "/settings", desc: "Tenant profile, system configuration, audit logs" },
      { name: "System Diagnostics & Event Stream", href: "/system-status", desc: "Platform operational health, database connectivity" },
    ];

    interface SearchResultPayload {
      id: string;
      title: string;
      subtitle: string;
      category: "MODULE" | "RECORD" | "ACTION" | "AI_RESPONSE" | "HITL_APPROVAL";
      href?: string;
      detailPayload?: {
        entityType: string;
        entityName: string;
        status: string;
        metadata: Record<string, unknown>;
      };
    }

    const results: SearchResultPayload[] = [];

    // 1. Modules scope (Server-side RBAC enforced)
    if (scope === "all" || scope === "modules") {
      const allowedModules = allPlatformModules.filter(
        (m) => isRouteAllowedForRole(userRole, m.href)
      );

      const matchedModules = allowedModules.filter((m) => {
        if (!q) return true;
        const target = `${m.name} ${m.desc}`.toLowerCase();
        return target.includes(q.toLowerCase());
      });

      results.push(
        ...matchedModules.map((m) => ({
          id: `mod-${m.href.replace(/\//g, "-").replace(/^-/, "") || "home"}`,
          title: m.name,
          subtitle: m.desc,
          category: "MODULE" as const,
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

    // 2. Records scope (Role-gated database queries)
    if (scope === "all" || scope === "records") {
      const canAccessCrm = isRouteAllowedForRole(userRole, "/crm");
      const canAccessConstruction = isRouteAllowedForRole(userRole, "/construction");
      const canAccessProcurement = isRouteAllowedForRole(userRole, "/procurement");

      // Query Sales Bookings
      if (canAccessCrm) {
        try {
          const bookings = await prisma.$queryRaw<Array<{
            id: string;
            status: string;
            booking_amount: number;
            customer_name: string | null;
            unit_name: string | null;
            project_name: string | null;
          }>>`
            SELECT b.id, b.status, b.agreed_total_price AS booking_amount,
                   c.full_name AS customer_name,
                   CONCAT(u.tower_name, ' - Unit ', u.unit_number) AS unit_name,
                   p.project_name
            FROM sales_bookings b
            LEFT JOIN master_customer c ON b.customer_id = c.id
            LEFT JOIN master_unit u ON b.unit_id = u.id
            LEFT JOIN master_project p ON u.project_id = p.id
            WHERE b.tenant_id = ${tenantId}::uuid
              AND (
                ${q === ""}
                OR c.full_name ILIKE ${searchPattern}
                OR u.unit_number ILIKE ${searchPattern}
                OR p.project_name ILIKE ${searchPattern}
              )
            ORDER BY b.created_at DESC
            LIMIT 15
          `;

          for (const b of bookings) {
            results.push({
              id: `rec-booking-${b.id}`,
              title: `Unit Booking: ${b.unit_name || "Unit"}`,
              subtitle: `Customer: ${b.customer_name || "Confidential"} • Booking Value: ₹${Number(b.booking_amount || 0).toLocaleString("en-IN")}`,
              category: "RECORD",
              href: "/crm",
              detailPayload: {
                entityType: "Sales Booking Record",
                entityName: `${b.unit_name || "Unit"} — ${b.customer_name || "Customer"}`,
                status: b.status || "CONFIRMED",
                metadata: {
                  customerName: b.customer_name || "Unassigned",
                  unitName: b.unit_name || "Unit",
                  bookingAmount: Number(b.booking_amount || 0),
                  projectName: b.project_name || "Avenue Real Estate",
                },
              },
            });
          }
        } catch {
          // Continue with other record streams if table is temporarily idle
        }
      }

      // Query Construction Contractor RA Bills
      if (canAccessConstruction) {
        try {
          const raBills = await prisma.$queryRaw<Array<{
            id: string;
            bill_number: string | null;
            contractor_name: string | null;
            status: string | null;
            wbs_phase: string | null;
            claimed_amount: number | null;
          }>>`
            SELECT id, bill_reference AS bill_number, contractor_name, status, wbs_phase,
                   gross_claim_amount AS claimed_amount
            FROM contractor_ra_bills
            WHERE tenant_id = ${tenantId}::uuid
              AND (
                ${q === ""}
                OR bill_reference ILIKE ${searchPattern}
                OR contractor_name ILIKE ${searchPattern}
                OR wbs_phase ILIKE ${searchPattern}
              )
            ORDER BY created_at DESC
            LIMIT 15
          `;

          for (const bill of raBills) {
            results.push({
              id: `rec-rabill-${bill.id}`,
              title: `Contractor Invoice #${bill.bill_number || "Bill"}`,
              subtitle: `Contractor: ${bill.contractor_name || "Vendor"} • Claimed: ₹${Number(bill.claimed_amount || 0).toLocaleString("en-IN")}`,
              category: "RECORD",
              href: "/construction",
              detailPayload: {
                entityType: "Construction RA Bill",
                entityName: bill.bill_number || "RA Bill",
                status: bill.status || "PENDING_VERIFICATION",
                metadata: {
                  contractorName: bill.contractor_name || "Contractor",
                  claimedAmount: Number(bill.claimed_amount || 0),
                  workPackage: bill.wbs_phase || "Civil Works",
                },
              },
            });
          }
        } catch {
          // Continue
        }
      }

      // Query Procurement Purchase Orders
      if (canAccessProcurement) {
        try {
          const purchaseOrders = await prisma.$queryRaw<Array<{
            id: string;
            po_number: string;
            vendor_name: string | null;
            status: string;
            total_amount: number;
          }>>`
            SELECT po.id, po.po_number, v.vendor_name, po.status, po.total_amount
            FROM purchase_orders po
            LEFT JOIN master_vendors v ON po.vendor_id = v.id
            WHERE po.tenant_id = ${tenantId}::uuid
              AND (
                ${q === ""}
                OR po.po_number ILIKE ${searchPattern}
                OR v.vendor_name ILIKE ${searchPattern}
              )
            ORDER BY po.created_at DESC
            LIMIT 15
          `;

          for (const po of purchaseOrders) {
            results.push({
              id: `rec-po-${po.id}`,
              title: `Purchase Order #${po.po_number}`,
              subtitle: `Vendor: ${po.vendor_name || "Vendor"} • Amount: ₹${Number(po.total_amount || 0).toLocaleString("en-IN")}`,
              category: "RECORD",
              href: "/procurement",
              detailPayload: {
                entityType: "Procurement Purchase Order",
                entityName: po.po_number,
                status: po.status,
                metadata: {
                  poNumber: po.po_number,
                  vendorName: po.vendor_name || "Vendor",
                  totalAmount: Number(po.total_amount || 0),
                },
              },
            });
          }
        } catch {
          // Continue
        }
      }
    }

    return envelope(200, {
      data: results,
      meta: {
        total_records: results.length,
        query: q,
        scope,
      },
    });
  } catch (err: unknown) {
    return envelope(500, {
      error: {
        code: "SEARCH_EXECUTION_ERROR",
        message: safeErrorMessage(err, "Search query could not be completed"),
      },
    });
  }
}
