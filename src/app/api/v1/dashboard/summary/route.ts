import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { CRORE_IN_RUPEES, LAKH_IN_RUPEES } from "@/lib/governance";
import { PLATFORM_DEPARTMENTS } from "@/lib/departments";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

const CLOSED_LEAD_STATUSES = ["LOST", "CLOSED", "DROPPED"];
const BOOKED_UNIT_STATUSES = ["BOOKED", "RESERVED"];
const SETTLED_ORDER_STATUSES = ["CLOSED", "CANCELLED", "REJECTED"];
const PENDING_STATUSES = ["PENDING", "PENDING_APPROVAL", "PENDING_BOARD_APPROVAL", "PENDING_GOVERNANCE_APPROVAL"];

const HITL_QUEUES: { table: string; label: string }[] = [
  { table: "finance_vouchers", label: "Disbursement Vouchers" },
  { table: "contractor_ra_bills", label: "Contractor Claims" },
  { table: "purchase_orders", label: "Purchase Orders" },
  { table: "ai_intelligence_approvals", label: "Advisory Outputs" },
  { table: "integration_approvals", label: "External Systems" },
  { table: "mcp_approvals", label: "Agent Actions" },
  { table: "communications_approvals", label: "Client Disputes" },
  { table: "hr_approvals", label: "Workforce Requests" },
  { table: "capital_allocation_requests", label: "Capital Allocation" },
  { table: "security_override_requests", label: "Access Overrides" },
  { table: "unit_handovers", label: "Possession Handovers" },
  { table: "user_role_approvals", label: "Role Elevations" },
];

const ALLOWED_HITL_TABLES = new Set(HITL_QUEUES.map((q) => q.table));

async function safeQuery<T>(run: () => Promise<T>, fallback: T, context = "query"): Promise<T> {
  try {
    return await run();
  } catch (err) {
    console.warn(`[dashboard/summary] ${context} failed:`, err);
    return fallback;
  }
}

async function getExistingTables(): Promise<Set<string>> {
  try {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    return new Set(rows.map((r) => r.tablename));
  } catch (err) {
    console.warn("[dashboard/summary] Failed to query catalog for public tables:", err);
    return new Set<string>();
  }
}

async function loadAuthorizationQueues(existingTables: Set<string>, tenantId: string) {
  const activeQueues = HITL_QUEUES.filter(
    (queue) => existingTables.has(queue.table) && ALLOWED_HITL_TABLES.has(queue.table)
  );

  const results = await Promise.all(
    activeQueues.map(async (queue) => {
      try {
        const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
          `SELECT COUNT(*)::int AS count FROM ${queue.table}
           WHERE tenant_id = $1::uuid AND requires_hitl = true AND status = ANY($2::text[])`,
          tenantId,
          PENDING_STATUSES
        );
        const pendingCount = Number(rows?.[0]?.count ?? 0);
        return pendingCount > 0 ? { label: queue.label, pendingCount } : null;
      } catch (err) {
        console.warn(`[dashboard/summary] Failed querying HITL queue ${queue.table}:`, err);
        return null;
      }
    })
  );

  return results
    .filter((r): r is { label: string; pendingCount: number } => r !== null)
    .sort((a, b) => b.pendingCount - a.pendingCount);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

  try {
    const existingTables = await getExistingTables();

    const qualifiedLeads = await safeQuery(
      () =>
        prisma.crmLead.findMany({
          where: { tenantId, status: { notIn: CLOSED_LEAD_STATUSES } },
          select: { budgetMax: true, leadSource: true, status: true },
        }),
      [],
      "crmLead.findMany"
    );

    const [
      bookedDemand,
      totalRegisteredUnits,
      bookedUnits,
      budgetCommitments,
      totalLeadCount,
      customerCount,
      workforceCount,
      projectCount,
    ] = await Promise.all([
      safeQuery(
        () =>
          prisma.salesBooking.aggregate({
            where: { tenantId },
            _sum: { agreedTotalPrice: true },
            _count: true,
          }),
        { _sum: { agreedTotalPrice: null }, _count: 0 },
        "salesBooking.aggregate"
      ),
      safeQuery(() => prisma.masterUnit.count({ where: { tenantId } }), 0, "masterUnit.count"),
      safeQuery(
        () =>
          prisma.masterUnit.count({
            where: { tenantId, status: { in: BOOKED_UNIT_STATUSES } },
          }),
        0,
        "masterUnit.bookedCount"
      ),
      safeQuery(
        () =>
          prisma.budgetHead.aggregate({
            where: { tenantId },
            _sum: { committedAmount: true, allocatedAmount: true, actualSpentAmount: true },
          }),
        { _sum: { committedAmount: null, allocatedAmount: null, actualSpentAmount: null } },
        "budgetHead.aggregate"
      ),
      safeQuery(() => prisma.crmLead.count({ where: { tenantId } }), 0, "crmLead.count"),
      safeQuery(() => prisma.masterCustomer.count({ where: { tenantId } }), 0, "masterCustomer.count"),
      safeQuery(
        async () => {
          if (!existingTables.has("hr_employees")) return [] as { count: number }[];
          return prisma.$queryRawUnsafe<{ count: number }[]>(
            `SELECT COUNT(*)::int AS count FROM hr_employees WHERE tenant_id = $1::uuid AND status = 'ACTIVE'`,
            tenantId
          );
        },
        [] as { count: number }[],
        "hr_employees.count"
      ),
      safeQuery(() => prisma.masterProject.count({ where: { tenantId } }), 0, "masterProject.count"),
    ]);

    const purchaseOrders = await safeQuery(
      async () => {
        if (!existingTables.has("purchase_orders")) return [] as { committed: string | null; open_count: number }[];
        return prisma.$queryRawUnsafe<{ committed: string | null; open_count: number }[]>(
          `SELECT COALESCE(SUM(order_value_amount), 0)::text AS committed, COUNT(*)::int AS open_count
           FROM purchase_orders
           WHERE tenant_id = $1::uuid AND status <> ALL($2::text[])`,
          tenantId,
          SETTLED_ORDER_STATUSES
        );
      },
      [] as { committed: string | null; open_count: number }[],
      "purchase_orders.aggregate"
    );

    const authorizationQueues = await loadAuthorizationQueues(existingTables, tenantId);

    const bookingTrendRows = await safeQuery(
      () =>
        prisma.$queryRawUnsafe<{ period: string; bookings: number; value: string }[]>(
          `SELECT to_char(created_at, 'YYYY-MM') AS period,
                   COUNT(*)::int AS bookings,
                   COALESCE(SUM(agreed_total_price), 0)::text AS value
           FROM sales_bookings
           WHERE tenant_id = $1::uuid
           GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
          tenantId
        ),
      [] as { period: string; bookings: number; value: string }[],
      "sales_bookings.trend"
    );

    const unitMixRows = await safeQuery(
      () =>
        prisma.$queryRawUnsafe<{ status: string; count: number }[]>(
          `SELECT status, COUNT(*)::int AS count FROM master_unit
           WHERE tenant_id = $1::uuid GROUP BY 1 ORDER BY 2 DESC`,
          tenantId
        ),
      [] as { status: string; count: number }[],
      "master_unit.mix"
    );

    const projectRows = await safeQuery(
      () =>
        prisma.$queryRawUnsafe<
          {
            project_name: string;
            location: string;
            total_units: number;
            booked_units: number;
            total_budget: string;
            expected_completion_date: Date | null;
          }[]
        >(
          `SELECT p.project_name, p.location, p.total_budget::text, p.expected_completion_date,
                  COUNT(u.id)::int AS total_units,
                  COUNT(u.id) FILTER (WHERE u.status = ANY($2::text[]))::int AS booked_units
           FROM master_project p
           LEFT JOIN master_unit u ON u.project_id = p.id
           WHERE p.tenant_id = $1::uuid
           GROUP BY p.id, p.project_name, p.location, p.total_budget, p.expected_completion_date
           ORDER BY p.created_at DESC`,
          tenantId,
          BOOKED_UNIT_STATUSES
        ),
      [] as {
        project_name: string;
        location: string;
        total_units: number;
        booked_units: number;
        total_budget: string;
        expected_completion_date: Date | null;
      }[],
      "master_project.portfolio"
    );

    const budgetRows = await safeQuery(
      () =>
        prisma.$queryRawUnsafe<
          { cost_centre: string; allocated: string; committed: string; spent: string }[]
        >(
          `SELECT cc.name AS cost_centre,
                  COALESCE(SUM(b.allocated_amount), 0)::text AS allocated,
                  COALESCE(SUM(b.committed_amount), 0)::text AS committed,
                  COALESCE(SUM(b.actual_spent_amount), 0)::text AS spent
           FROM budget_heads b
           JOIN master_cost_center cc ON cc.id = b.cost_center_id
           WHERE b.tenant_id = $1::uuid
           GROUP BY cc.name ORDER BY 2 DESC LIMIT 8`,
          tenantId
        ),
      [] as { cost_centre: string; allocated: string; committed: string; spent: string }[],
      "budget_heads.utilisation"
    );

    const claimRows = await safeQuery(
      async () => {
        if (!existingTables.has("contractor_ra_bills")) return [] as { status: string; count: number; value: string }[];
        return prisma.$queryRawUnsafe<{ status: string; count: number; value: string }[]>(
          `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(gross_claim_amount), 0)::text AS value
           FROM contractor_ra_bills WHERE tenant_id = $1::uuid GROUP BY 1 ORDER BY 2 DESC`,
          tenantId
        );
      },
      [] as { status: string; count: number; value: string }[],
      "contractor_ra_bills.status"
    );

    const ticketRows = await safeQuery(
      async () => {
        if (!existingTables.has("support_tickets")) return [] as { status: string; count: number }[];
        return prisma.$queryRawUnsafe<{ status: string; count: number }[]>(
          `SELECT status, COUNT(*)::int AS count FROM support_tickets
           WHERE tenant_id = $1::uuid GROUP BY 1 ORDER BY 2 DESC`,
          tenantId
        );
      },
      [] as { status: string; count: number }[],
      "support_tickets.status"
    );

    const activityRows = await safeQuery(
      async () => {
        const hasTickets = existingTables.has("support_tickets");
        const hasBills = existingTables.has("contractor_ra_bills");

        let query = `
          SELECT b.booking_code AS label,
                 CONCAT(c.full_name, ' • ', u.tower_name, ' Unit ', u.unit_number) AS detail,
                 'Booking' AS category,
                 b.created_at AS occurred_at
          FROM sales_bookings b
          LEFT JOIN master_customer c ON c.id = b.customer_id
          LEFT JOIN master_unit u ON u.id = b.unit_id
          WHERE b.tenant_id = $1::uuid
        `;

        if (hasBills) {
          query += `
            UNION ALL
            SELECT r.bill_reference, CONCAT(r.contractor_name, ' • ', r.wbs_phase), 'Contractor Claim', r.created_at
            FROM contractor_ra_bills r WHERE r.tenant_id = $1::uuid
          `;
        }

        if (hasTickets) {
          query += `
            UNION ALL
            SELECT t.ticket_reference, CONCAT(t.customer_name, ' • ', t.subject), 'Support Ticket', t.created_at
            FROM support_tickets t WHERE t.tenant_id = $1::uuid
          `;
        }

        query += ` ORDER BY occurred_at DESC LIMIT 10`;

        return prisma.$queryRawUnsafe<{ label: string; detail: string; category: string; occurred_at: Date }[]>(
          query,
          tenantId
        );
      },
      [] as { label: string; detail: string; category: string; occurred_at: Date }[],
      "activity.recent"
    );

    const leadDemandAmount = qualifiedLeads.reduce((total, lead) => total + Number(lead.budgetMax || 0), 0);
    const bookedDemandAmount = Number(bookedDemand._sum.agreedTotalPrice || 0);
    const committedFromOrders = Number(purchaseOrders?.[0]?.committed ?? 0);
    const committedAmount = Number(budgetCommitments._sum.committedAmount || 0) + committedFromOrders;
    const pendingHitlApprovals = authorizationQueues.reduce((total, queue) => total + queue.pendingCount, 0);
    const reservedUnits = unitMixRows.find((row) => row.status === "RESERVED")?.count ?? 0;
    const claimsPendingValue = claimRows
      .filter((row) => PENDING_STATUSES.includes(row.status))
      .reduce((total, row) => total + Number(row.value || 0), 0);

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        salesPipelineDemand: Number(((leadDemandAmount + bookedDemandAmount) / CRORE_IN_RUPEES).toFixed(2)),
        qualifiedLeadsCount: qualifiedLeads.length,
        inventoryRealizationPct:
          totalRegisteredUnits > 0 ? Number(((bookedUnits / totalRegisteredUnits) * 100).toFixed(1)) : 0,
        totalRegisteredUnits,
        bookedUnits,
        committedLiabilities: Number((committedAmount / CRORE_IN_RUPEES).toFixed(2)),
        activeCostCenterPOs: Number(purchaseOrders?.[0]?.open_count ?? 0),
        pendingHitlApprovals,
        activeDepartmentsCount: PLATFORM_DEPARTMENTS.length,

        registeredCustomers: customerCount,
        activeWorkforce: Number(workforceCount?.[0]?.count ?? 0),
        activeDevelopments: projectCount,
        contractorClaimsPendingCr: Number((claimsPendingValue / CRORE_IN_RUPEES).toFixed(2)),

        bookingTrend: bookingTrendRows
          .slice()
          .reverse()
          .map((row) => ({
            period: row.period,
            bookings: Number(row.bookings),
            bookedValueCr: Number((Number(row.value || 0) / CRORE_IN_RUPEES).toFixed(2)),
          })),

        inventoryMix: unitMixRows.map((row) => ({
          status: row.status,
          count: Number(row.count),
        })),

        salesFunnel: [
          { stage: "Prospects Captured", count: totalLeadCount },
          { stage: "Active Prospects", count: qualifiedLeads.length },
          { stage: "Units Reserved", count: reservedUnits },
          { stage: "Units Booked", count: bookedUnits },
          { stage: "Bookings Confirmed", count: Number(bookedDemand._count || 0) },
        ],

        authorizationQueues,

        projectPortfolio: projectRows.map((row) => ({
          projectName: row.project_name,
          location: row.location,
          totalUnits: Number(row.total_units),
          bookedUnits: Number(row.booked_units),
          realizationPct:
            Number(row.total_units) > 0
              ? Number(((Number(row.booked_units) / Number(row.total_units)) * 100).toFixed(1))
              : 0,
          sanctionedBudgetCr: Number((Number(row.total_budget || 0) / CRORE_IN_RUPEES).toFixed(2)),
          targetCompletion: row.expected_completion_date
            ? new Date(row.expected_completion_date).toISOString().split("T")[0]
            : "",
        })),

        budgetUtilisation: budgetRows.map((row) => {
          const allocated = Number(row.allocated || 0);
          const committed = Number(row.committed || 0);
          const spent = Number(row.spent || 0);
          const totalEngaged = committed + spent;
          return {
            costCentre: row.cost_centre,
            allocatedLakhs: Number((allocated / LAKH_IN_RUPEES).toFixed(2)),
            committedLakhs: Number((committed / LAKH_IN_RUPEES).toFixed(2)),
            spentLakhs: Number((spent / LAKH_IN_RUPEES).toFixed(2)),
            utilisationPct:
              allocated > 0 ? Number(((totalEngaged / allocated) * 100).toFixed(1)) : totalEngaged > 0 ? 100.0 : 0.0,
          };
        }),

        contractorClaims: claimRows.map((row) => ({
          status: row.status,
          count: Number(row.count),
          valueCr: Number((Number(row.value || 0) / CRORE_IN_RUPEES).toFixed(2)),
        })),

        supportTickets: ticketRows.map((row) => ({
          status: row.status,
          count: Number(row.count),
        })),

        recentRecords: activityRows.map((row) => ({
          label: row.label,
          detail: row.detail || "",
          category: row.category,
          occurredAt: new Date(row.occurred_at).toISOString(),
        })),
      },
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
          code: "DASHBOARD_SUMMARY_ERROR",
          message: safeErrorMessage(err, "Operating console figures could not be loaded"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
