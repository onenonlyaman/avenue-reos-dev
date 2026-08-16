export interface StatutoryRule {
  ruleCode: string;
  ruleCategory: "GST_RATE" | "TDS_THRESHOLD" | "MSME_COMPLIANCE" | "INCOME_TAX_SLAB";
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string | null;
  rulePayload: Record<string, any>;
  description: string;
}

export const BUDGET_2026_RULES: StatutoryRule[] = [
  {
    ruleCode: "GST-STD-2026",
    ruleCategory: "GST_RATE",
    effectiveFrom: "2026-04-01",
    effectiveTo: null,
    rulePayload: {
      standardSlabs: [0, 5, 12, 18, 28],
      realEstateAffordableHousingRate: 1.0,
      realEstateCommercialRate: 5.0,
      constructionMaterialRate: 18.0,
      einvoiceMandatoryTurnoverCr: 5.0,
    },
    description: "Budget 2026 Indian GST Statutory Rate Framework",
  },
  {
    ruleCode: "TDS-SECTIONS-2026",
    ruleCategory: "TDS_THRESHOLD",
    effectiveFrom: "2026-04-01",
    effectiveTo: null,
    rulePayload: {
      sections: {
        "194C": { name: "Contractors", rateInd: 1.0, rateCorp: 2.0, singleThreshold: 30000, aggregateThreshold: 100000 },
        "194J": { name: "Professional & Tech Fees", rate: 10.0, rateTech: 2.0, threshold: 30000 },
        "194Q": { name: "Purchase of Goods", rate: 0.1, threshold: 5000000 },
        "194H": { name: "Brokerage & Commission", rate: 2.0, threshold: 15000 },
        "194I": { name: "Rent on Land/Building", rate: 10.0, threshold: 240000 },
      },
      nonPanHigherRate: 20.0,
    },
    description: "Budget 2026 TDS Deduction Thresholds and Rates",
  },
  {
    ruleCode: "MSME-43BH-2026",
    ruleCategory: "MSME_COMPLIANCE",
    effectiveFrom: "2024-04-01",
    effectiveTo: null,
    rulePayload: {
      withoutAgreementDays: 15,
      withAgreementMaxDays: 45,
      interestCompounding: "MONTHLY",
      interestRateOverRbiRepo: 3.0, // 3x RBI Bank Rate
    },
    description: "Section 43B(h) MSME Timely Payment Compliance Window",
  },
];

/**
 * Resolves the active statutory rule for a transaction based on posting date
 * Formula: RuleSet = (T_voucher < T_Effective) ? Legacy_Rules : Updated_Rules
 */
export function resolveStatutoryRule(
  category: "GST_RATE" | "TDS_THRESHOLD" | "MSME_COMPLIANCE" | "INCOME_TAX_SLAB",
  transactionDate: string,
  customRules: StatutoryRule[] = []
): StatutoryRule | undefined {
  const allRules = [...customRules, ...BUDGET_2026_RULES].filter((r) => r.ruleCategory === category);
  const targetDate = new Date(transactionDate).getTime();

  const applicable = allRules.filter((r) => {
    const from = new Date(r.effectiveFrom).getTime();
    const to = r.effectiveTo ? new Date(r.effectiveTo).getTime() : Infinity;
    return targetDate >= from && targetDate <= to;
  });

  return applicable.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];
}
