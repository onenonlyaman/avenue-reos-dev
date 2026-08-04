import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { postingDate, accountHead, costCenter, debitAmount, creditAmount, documentRef } = body;

  const numDebit = Number(debitAmount) || 0;
  const numCredit = Number(creditAmount) || 0;
  const requiresHitl = numDebit > 4000000;
  const status = requiresHitl ? "PENDING_HITL" : "POSTED";
  const tenantId = ACTIVE_TENANT_ID;

  try {
    let account = null;
    if (accountHead) {
      const codeMatch = accountHead.match(/^(\d+)/);
      const code = codeMatch ? codeMatch[1] : accountHead;
      const cleanName = accountHead.includes(" - ") ? accountHead.split(" - ")[1] : accountHead;

      account = await prisma.masterChartOfAccounts.findFirst({
        where: { tenantId: ACTIVE_TENANT_ID,
          OR: [
            { accountCode: { equals: code, mode: "insensitive" } },
            { accountName: { contains: cleanName, mode: "insensitive" } },
          ],
        },
      });
    }

    if (!account) {
      account = await prisma.masterChartOfAccounts.create({
        data: {
          tenantId,
          accountCode: `ACC-${Math.floor(1000 + Math.random() * 9000)}`,
          accountName: accountHead || "General Ledger Head",
          accountType: "EXPENSE",
          status: "ACTIVE",
        },
      });
    }

    let targetCostCenter = null;
    if (costCenter) {
      const codeMatch = costCenter.match(/^(CC-[A-Z0-9-]+)/i);
      const code = codeMatch ? codeMatch[1] : costCenter;
      const nameInParens = costCenter.includes("(") ? costCenter.substring(costCenter.indexOf("(") + 1, costCenter.indexOf(")")) : costCenter;

      targetCostCenter = await prisma.masterCostCenter.findFirst({
        where: { tenantId: ACTIVE_TENANT_ID,
          OR: [
            { costCenterCode: { equals: code, mode: "insensitive" } },
            { name: { contains: nameInParens, mode: "insensitive" } },
          ],
        },
      });
    }

    const validSourceUuid = documentRef && UUID_REGEX.test(documentRef) ? documentRef : crypto.randomUUID();

    const createdEntry = await prisma.generalLedgerEntry.create({
      data: {
        tenantId,
        voucherNumber: `JV-2026-${Math.floor(100 + Math.random() * 900)}`,
        transactionDate: postingDate ? new Date(postingDate) : new Date(),
        accountId: account.id,
        costCenterId: targetCostCenter?.id || null,
        debitAmount: numDebit,
        creditAmount: numCredit,
        narration: `${accountHead || "General Journal"} — ${documentRef || "DOC-REF"}`,
        sourceModule: "FINANCE_ERP",
        sourceReferenceId: validSourceUuid,
      },
    });

    const newEntry = {
      id: createdEntry.id,
      postingDate: createdEntry.transactionDate.toISOString().split("T")[0],
      entryNumber: createdEntry.voucherNumber,
      accountHead: account.accountName,
      costCenter: targetCostCenter?.name || costCenter || "General Corporate",
      debitAmount: Number(createdEntry.debitAmount),
      creditAmount: Number(createdEntry.creditAmount),
      postedBy: "Executive Finance User",
      approvalStatus: status as "POSTED" | "PENDING_HITL" | "REJECTED",
      documentRef: documentRef || `DOC-REF-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        entry: newEntry,
        requiresHitl,
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
        code: "CREATE_JOURNAL_ENTRY_ERROR",
        message: err instanceof Error ? err.message : "Journal entry could not be saved",
      },
    });
  }
}
