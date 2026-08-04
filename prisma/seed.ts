import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "00000000-0000-0000-0000-000000000001";

  const project = await prisma.masterProject.upsert({
    where: { uq_project_code: { tenantId, projectCode: "PRJ-GNK-01" } },
    update: {},
    create: {
      tenantId,
      projectCode: "PRJ-GNK-01",
      projectName: "Avenue Horizon - Gangapur Road",
      location: "Gangapur Road, Nashik",
      totalAreaSqft: 250000.0,
      totalBudget: 850000000.0,
      status: "ACTIVE",
      startDate: new Date("2025-01-01"),
      expectedCompletionDate: new Date("2027-12-31"),
    },
  });

  const costCenter = await prisma.masterCostCenter.upsert({
    where: { uq_cost_center: { tenantId, costCenterCode: "CC-GNK-01" } },
    update: {},
    create: {
      tenantId,
      costCenterCode: "CC-GNK-01",
      name: "Gangapur Rd Concrete Head",
      projectId: project.id,
      allocatedBudget: 45000000.0,
      status: "ACTIVE",
    },
  });

  const account = await prisma.masterChartOfAccounts.upsert({
    where: { uq_account_code: { tenantId, accountCode: "COA-CAPEX-01" } },
    update: {},
    create: {
      tenantId,
      accountCode: "COA-CAPEX-01",
      accountName: "Capital Expenditure — Concrete Works",
      accountType: "EXPENSE",
      status: "ACTIVE",
    },
  });

  await prisma.generalLedgerEntry.create({
    data: {
      tenantId,
      voucherNumber: "JV-2026-089",
      transactionDate: new Date("2026-07-28"),
      accountId: account.id,
      costCenterId: costCenter.id,
      debitAmount: 4500000.0,
      creditAmount: 0.0,
      narration: "Capital Expenditure — Concrete Works — DOC-PO-9021",
      sourceModule: "FINANCE_ERP",
      sourceReferenceId: "DOC-PO-9021",
    },
  });

  await prisma.budgetHead.upsert({
    where: { uq_budget_head: { tenantId, budgetCode: "CC-GNK-01" } },
    update: {},
    create: {
      tenantId,
      budgetCode: "CC-GNK-01",
      costCenterId: costCenter.id,
      allocatedAmount: 45000000.0,
      committedAmount: 32050000.0,
      actualSpentAmount: 28000000.0,
      fiscalYear: "FY 2026-27",
      status: "ACTIVE",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
