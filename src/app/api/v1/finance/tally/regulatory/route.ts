import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureAccountingSchema } from "@/lib/accounting/ensureAccountingSchema";
import { BUDGET_2026_RULES } from "@/lib/accounting/regulatoryEngine";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;

    const dbRules = await prisma.$queryRaw<any[]>`
      SELECT id, rule_code as "ruleCode", rule_category as "ruleCategory",
             effective_from as "effectiveFrom", effective_to as "effectiveTo",
             rule_payload as "rulePayload", description, created_at as "createdAt"
      FROM tally_statutory_rules
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY effective_from DESC;
    `;

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        budgetFrameworkVersion: "Budget 2026 Statutory Release v1.0",
        effectiveFiscalYear: "FY 2026-27",
        statutoryRules: dbRules.length > 0 ? dbRules : BUDGET_2026_RULES,
        gstRateSlabs: [0, 5, 12, 18, 28],
        tdsSections: [
          { section: "194C", description: "Contractor Payments (2% Civil, 1% Individual)", threshold: 100000 },
          { section: "194J", description: "Professional & Technical Services (10%)", threshold: 30000 },
          { section: "194Q", description: "Purchase of Materials/Goods (0.1%)", threshold: 5000000 },
          { section: "194H", description: "Commission and Brokerage (2%)", threshold: 15000 },
          { section: "194I", description: "Rent for Plant/Machinery/Land (10%)", threshold: 240000 },
        ],
        msmeRule43bh: {
          withoutAgreementWindowDays: 15,
          withAgreementMaxWindowDays: 45,
          interestRatePenalty: "3x RBI Bank Rate compounding monthly",
        },
      },
      error: null,
      meta: { rules_count: dbRules.length },
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
          code: "REGULATORY_FETCH_ERROR",
          message: safeErrorMessage(err, "Failed to load Budget 2026 regulatory rules"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
