import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureAccountingSchema } from "@/lib/accounting/ensureAccountingSchema";
import { parseBankStatementCsv, executeFuzzyMatching, generateCorporatePayoutCsv } from "@/lib/accounting/brsEngine";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;

    // 1. Fetch Bank Ledgers
    const bankLedgers = await prisma.$queryRaw<any[]>`
      SELECT l.id, l.ledger_name as "accountName", l.bank_account_number as "accountNumber",
             l.bank_ifsc_code as "ifscCode", l.current_balance as "bookBalance"
      FROM tally_account_ledgers l
      JOIN tally_account_groups g ON l.group_id = g.id
      WHERE l.tenant_id = ${tenantId}::uuid AND g.group_code = 'GRP-100' AND l.book_type = 'STATUTORY'
      ORDER BY l.ledger_name ASC;
    `;

    // 2. Fetch Statement Lines
    const statementLines = await prisma.$queryRaw<any[]>`
      SELECT sl.id, sl.transaction_date as "transactionDate", sl.value_date as "valueDate",
             sl.reference_number as "referenceNumber", sl.description, sl.entry_type as "entryType",
             sl.amount, sl.balance_after as "balanceAfter", sl.match_status as "matchStatus",
             sl.match_score as "matchScore"
      FROM tally_bank_statement_lines sl
      WHERE sl.tenant_id = ${tenantId}::uuid
      ORDER BY sl.transaction_date DESC
      LIMIT 100;
    `;

    // 3. Fetch Book Vouchers (Bank entries)
    const bookEntries = await prisma.$queryRaw<any[]>`
      SELECT v.id as "voucherId", v.voucher_number as "voucherNumber", v.voucher_date as "voucherDate",
             v.reference_number as "referenceNumber", v.narration as "particulars",
             vi.entry_type as "entryType", vi.amount
      FROM tally_vouchers v
      JOIN tally_voucher_items vi ON v.id = vi.voucher_id
      JOIN tally_account_ledgers l ON vi.ledger_id = l.id
      JOIN tally_account_groups g ON l.group_id = g.id
      WHERE v.tenant_id = ${tenantId}::uuid AND g.group_code = 'GRP-100'
      ORDER BY v.voucher_date DESC
      LIMIT 100;
    `;

    const mappedAccounts = bankLedgers.map((b) => ({
      id: b.id,
      bankName: b.accountName.includes("HDFC") ? "HDFC Bank Ltd" : b.accountName.includes("ICICI") ? "ICICI Bank Ltd" : "Corporate Bank",
      accountNumber: b.accountNumber || "502000998811",
      ifscCode: b.ifscCode || "HDFC0000123",
      bookBalance: Number(b.bookBalance),
      bankStatementBalance: Number(b.bookBalance),
      unreconciledDr: 0,
      unreconciledCr: 0,
      lastReconciledDate: new Date().toISOString().split("T")[0],
    }));

    const mappedStatements = statementLines.map((s) => ({
      id: s.id,
      date: s.transactionDate ? new Date(s.transactionDate).toISOString().split("T")[0] : "",
      reference: s.referenceNumber,
      description: s.description,
      withdrawalDebit: s.entryType === "Dr" ? Number(s.amount) : 0,
      depositCredit: s.entryType === "Cr" ? Number(s.amount) : 0,
      status: s.matchStatus === "AUTO_MATCHED" || s.matchStatus === "MANUAL_MATCHED" ? "MATCHED" : "UNMATCHED",
      matchedVoucherNumber: s.referenceNumber,
      matchScore: Number(s.matchScore || 0),
    }));

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        accounts: mappedAccounts,
        unmatchedStatements: mappedStatements,
        bookEntries: bookEntries.map((b) => ({
          voucherId: b.voucherId,
          voucherNumber: b.voucherNumber,
          voucherDate: b.voucherDate ? new Date(b.voucherDate).toISOString().split("T")[0] : "",
          referenceNumber: b.referenceNumber || "",
          particulars: b.particulars || "",
          entryType: b.entryType,
          amount: Number(b.amount),
        })),
      },
      error: null,
      meta: { accounts_count: mappedAccounts.length, statement_lines_count: mappedStatements.length },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: { accounts: [], unmatchedStatements: [], bookEntries: [] },
        error: {
          code: "BRS_DATA_FETCH_ERROR",
          message: safeErrorMessage(err, "Failed to load Bank Reconciliation data"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;
    const body = await request.json();

    // 1. Upload & Parse Statement CSV
    if (body.action === "UPLOAD_STATEMENT_CSV" && body.csvContent && body.bankLedgerId) {
      const parsedTxns = parseBankStatementCsv(body.csvContent);

      const statementRows = await prisma.$queryRaw<any[]>`
        INSERT INTO tally_bank_statements (
          tenant_id, bank_ledger_id, statement_file_name, statement_format, total_transactions
        ) VALUES (
          ${tenantId}::uuid, ${body.bankLedgerId}::uuid, ${body.fileName || 'bank_statement.csv'}, 'CSV', ${parsedTxns.length}
        )
        RETURNING id;
      `;
      const stmtId = statementRows[0].id;

      for (const tx of parsedTxns) {
        await prisma.$executeRaw`
          INSERT INTO tally_bank_statement_lines (
            tenant_id, statement_id, transaction_date, reference_number, description, entry_type, amount, balance_after, match_status
          ) VALUES (
            ${tenantId}::uuid, ${stmtId}::uuid, ${tx.transactionDate}::date, ${tx.referenceNumber},
            ${tx.description}, ${tx.entryType}, ${tx.amount}, ${tx.balanceAfter || 0}, 'UNMATCHED'
          );
        `;
      }

      return NextResponse.json({
        success: true,
        message: `Successfully parsed and recorded ${parsedTxns.length} statement transactions.`,
        statementId: stmtId,
        count: parsedTxns.length,
      });
    }

    // 2. Automated 3-Point Fuzzy Reconciliation
    if (body.action === "AUTO_RECONCILE") {
      const statementLines = await prisma.$queryRaw<any[]>`
        SELECT id, transaction_date, reference_number, description, entry_type, amount
        FROM tally_bank_statement_lines
        WHERE tenant_id = ${tenantId}::uuid AND match_status = 'UNMATCHED';
      `;

      const bookVouchers = await prisma.$queryRaw<any[]>`
        SELECT v.id as "voucherId", v.voucher_number as "voucherNumber", v.voucher_date as "voucherDate",
               v.reference_number as "referenceNumber", v.narration as "particulars",
               vi.entry_type as "entryType", vi.amount
        FROM tally_vouchers v
        JOIN tally_voucher_items vi ON v.id = vi.voucher_id
        JOIN tally_account_ledgers l ON vi.ledger_id = l.id
        JOIN tally_account_groups g ON l.group_id = g.id
        WHERE v.tenant_id = ${tenantId}::uuid AND g.group_code = 'GRP-100';
      `;

      const formattedBankTx = statementLines.map((sl) => ({
        id: sl.id,
        transactionDate: sl.transaction_date ? new Date(sl.transaction_date).toISOString().split("T")[0] : "",
        referenceNumber: sl.reference_number || "",
        description: sl.description || "",
        entryType: sl.entry_type as "Dr" | "Cr",
        amount: Number(sl.amount),
      }));

      const formattedBook = bookVouchers.map((b) => ({
        voucherId: b.voucherId,
        voucherNumber: b.voucherNumber,
        voucherDate: b.voucherDate ? new Date(b.voucherDate).toISOString().split("T")[0] : "",
        referenceNumber: b.referenceNumber || "",
        particulars: b.particulars || "",
        entryType: b.entryType as "Dr" | "Cr",
        amount: Number(b.amount),
      }));

      const matchResults = executeFuzzyMatching(formattedBankTx, formattedBook);
      let matchedCount = 0;

      for (let idx = 0; idx < matchResults.length; idx++) {
        const mr = matchResults[idx];
        const rawLine = statementLines[idx];
        if (mr.matchedVoucher && mr.score >= 70 && rawLine) {
          await prisma.$executeRaw`
            UPDATE tally_bank_statement_lines
            SET matched_voucher_id = ${mr.matchedVoucher.voucherId}::uuid,
                match_status = 'AUTO_MATCHED',
                match_score = ${mr.score}
            WHERE id = ${rawLine.id}::uuid AND tenant_id = ${tenantId}::uuid;
          `;
          matchedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Fuzzy auto-matching complete. Reconciled ${matchedCount} transactions.`,
        reconciledCount: matchedCount,
        matchResults,
      });
    }

    // 3. Corporate Payout Batch CSV Export
    if (body.action === "EXPORT_PAYOUT_BATCH") {
      const payments = body.payments || [
        {
          beneficiaryName: "UltraTech Cement Vendor",
          accountNumber: "919020087654321",
          ifscCode: "UTIB0000456",
          amount: 2850000,
          paymentRef: "PO-CEMENT-0826",
          remarks: "Cement Material Advance",
        },
      ];

      const csvData = generateCorporatePayoutCsv(payments);
      return NextResponse.json({
        success: true,
        csvData,
        fileName: `CORPORATE_PAYOUT_BATCH_${Date.now()}.csv`,
      });
    }

    return NextResponse.json(
      { success: false, error: { message: "Invalid banking BRS action requested" } },
      { status: 400 }
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
          code: "BRS_ACTION_ERROR",
          message: safeErrorMessage(err, "Failed to process BRS action"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
