import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { envelope, requireApiAccess } from "@/lib/apiAccess";

export const dynamic = "force-dynamic";

const MAX_STATEMENT_ROWS = 5000;
const MAX_RAW_LENGTH = 5 * 1024 * 1024;

async function ensureBrsTable() {
  await runtimeDdl("table:tally_bank_statements", () => prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tally_bank_statements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      description TEXT NOT NULL,
      reference_number VARCHAR(100) NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      type VARCHAR(20) NOT NULL DEFAULT 'CREDIT',
      status VARCHAR(50) NOT NULL DEFAULT 'UNRECONCILED',
      match_confidence_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

interface StatementRow {
  id: string;
  transaction_date: Date | null;
  description: string;
  reference_number: string;
  amount: string;
  type: string;
  status: string;
  match_confidence_pct: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureBrsTable();

    const rows = await prisma.$queryRaw<StatementRow[]>`
      SELECT * FROM tally_bank_statements
      WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid
      ORDER BY transaction_date DESC
    `;

    const mapped = rows.map((r) => ({
      id: r.id,
      transactionDate: r.transaction_date
        ? new Date(r.transaction_date).toISOString().split("T")[0]
        : null,
      description: r.description,
      referenceNumber: r.reference_number,
      amount: Number(r.amount),
      type: r.type,
      status: r.status,
      matchConfidencePct: Number(r.match_confidence_pct),
    }));

    // Balance is the net of what has actually been imported. The previous implementation
    // seeded this reduction with a literal 4,850,000, derived a "passbook balance" from an
    // invented 12,500-per-item adjustment and reported a fixed 85,400 of cash in hand, so
    // all three figures were fiction.
    const importedNetAmount = mapped.reduce(
      (acc, r) => acc + (r.type === "CREDIT" ? r.amount : -r.amount),
      0
    );

    return envelope(200, {
      data: {
        importedNetAmount,
        reconciledAmount: mapped
          .filter((r) => r.status === "RECONCILED")
          .reduce((acc, r) => acc + (r.type === "CREDIT" ? r.amount : -r.amount), 0),
        unreconciledChequesCount: mapped.filter((r) => r.status !== "RECONCILED").length,
        matchedTransactionsCount: mapped.filter((r) => r.status === "RECONCILED").length,
        brsItems: mapped,
      },
      meta: { total_records: mapped.length },
    });
  } catch (err) {
    console.error("[finance/tally/banking/e-brs] read failed", err);
    return envelope(503, {
      error: {
        code: "EBRS_UNAVAILABLE",
        message: "Bank reconciliation records could not be loaded.",
      },
    });
  }
}

interface ParsedLine {
  date: Date;
  description: string;
  reference: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
}

/**
 * Parses a delimited bank statement export.
 *
 * Expected columns: date, description, reference, amount, type(CREDIT|DEBIT).
 * A negative amount with no explicit type is treated as a debit. Rows that cannot be
 * parsed are reported back to the caller — nothing is guessed or substituted.
 */
function parseStatement(raw: string): { rows: ParsedLine[]; errors: string[] } {
  const rows: ParsedLine[] = [];
  const errors: string[] = [];

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const [index, line] of lines.entries()) {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

    if (index === 0 && /date/i.test(cells[0] ?? "")) continue;

    if (cells.length < 4) {
      errors.push(`Line ${index + 1}: expected at least 4 columns, found ${cells.length}.`);
      continue;
    }

    const [dateCell, descriptionCell, referenceCell, amountCell, typeCell] = cells;

    const date = new Date(dateCell);
    if (Number.isNaN(date.getTime())) {
      errors.push(`Line ${index + 1}: "${dateCell}" is not a readable date.`);
      continue;
    }

    const amountValue = Number(String(amountCell).replace(/[,\s]/g, ""));
    if (!Number.isFinite(amountValue) || amountValue === 0) {
      errors.push(`Line ${index + 1}: "${amountCell}" is not a usable amount.`);
      continue;
    }

    if (!descriptionCell || !referenceCell) {
      errors.push(`Line ${index + 1}: description and reference are both required.`);
      continue;
    }

    const declaredType = (typeCell ?? "").toUpperCase();
    const type: "CREDIT" | "DEBIT" =
      declaredType === "CREDIT" || declaredType === "DEBIT"
        ? declaredType
        : amountValue < 0
          ? "DEBIT"
          : "CREDIT";

    rows.push({
      date,
      description: descriptionCell.slice(0, 500),
      reference: referenceCell.slice(0, 100),
      amount: Math.abs(amountValue),
      type,
    });
  }

  return { rows, errors };
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return envelope(400, {
      error: { code: "MALFORMED_REQUEST", message: "Request body must be valid JSON." },
    });
  }

  const rawData = body.rawData;
  const filename = typeof body.filename === "string" ? body.filename.slice(0, 200) : "statement";

  if (typeof rawData !== "string" || rawData.trim().length === 0) {
    return envelope(400, {
      error: {
        code: "EMPTY_STATEMENT",
        message: "Attach a statement file. No transactions were supplied.",
      },
    });
  }

  if (rawData.length > MAX_RAW_LENGTH) {
    return envelope(413, {
      error: { code: "STATEMENT_TOO_LARGE", message: "The statement exceeds the 5 MB limit." },
    });
  }

  const { rows, errors } = parseStatement(rawData);

  if (rows.length === 0) {
    return envelope(422, {
      error: {
        code: "STATEMENT_UNREADABLE",
        message:
          errors[0] ??
          "No transactions could be read. Expected columns: date, description, reference, amount, type.",
      },
      meta: { total_records: 0 },
    });
  }

  if (rows.length > MAX_STATEMENT_ROWS) {
    return envelope(413, {
      error: {
        code: "STATEMENT_TOO_LARGE",
        message: `The statement contains ${rows.length} rows; the limit is ${MAX_STATEMENT_ROWS}.`,
      },
    });
  }

  try {
    await ensureBrsTable();

    // One transaction: an import either lands whole or not at all.
    const imported = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const row of rows) {
        await tx.$executeRaw`
          INSERT INTO tally_bank_statements (
            tenant_id, transaction_date, description, reference_number, amount, type,
            status, match_confidence_pct
          ) VALUES (
            ${ACTIVE_TENANT_ID}::uuid, ${row.date}, ${`${row.description} (${filename})`},
            ${row.reference}, ${row.amount}, ${row.type}, 'UNRECONCILED', 0.00
          )
        `;
        count += 1;
      }
      return count;
    });

    // Imported lines are recorded as UNRECONCILED. This platform has no matching engine,
    // so nothing here may claim a match confidence it did not compute. The previous
    // implementation ignored the uploaded file entirely and inserted a fixed 175,000
    // credit marked RECONCILED at 98.5% confidence.
    return envelope(201, {
      data: {
        importedCount: imported,
        rejectedCount: errors.length,
        rejectedLines: errors.slice(0, 20),
        reconciliationPerformed: false,
      },
      meta: { total_records: imported },
    });
  } catch (err) {
    console.error("[finance/tally/banking/e-brs] import failed", err);
    return envelope(503, {
      error: {
        code: "EBRS_IMPORT_FAILED",
        message: "The statement could not be imported. No transactions were saved.",
      },
    });
  }
}
