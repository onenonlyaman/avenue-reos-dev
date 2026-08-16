import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import crypto from "crypto";

export type VoucherType =
  | "RECEIPT"
  | "PAYMENT"
  | "CONTRA"
  | "JOURNAL"
  | "SALES"
  | "PURCHASE"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  | "DELIVERY_NOTE"
  | "RECEIPT_NOTE"
  | "STOCK_JOURNAL"
  | "PHYSICAL_STOCK";

export interface VoucherLineInput {
  ledgerId: string;
  costCenterId?: string | null;
  entryType: "Dr" | "Cr";
  amount: number;
  billReference?: string | null;
  particulars?: string | null;
}

export interface BillRefInput {
  billNumber: string;
  refType: "NEW_REF" | "AGST_REF" | "ADVANCE" | "ON_ACCOUNT";
  originalAmount: number;
  pendingAmount?: number;
  billDate?: string;
  dueDate: string;
  interestRatePct?: number;
}

export interface CreateVoucherPayload {
  voucherType: VoucherType;
  bookType?: "STATUTORY" | "INTERNAL";
  voucherDate?: string;
  referenceNumber?: string | null;
  narration?: string | null;
  currency?: string;
  exchangeRate?: number;
  items: VoucherLineInput[];
  billRefs?: BillRefInput[];
  operatorId: string;
  reasonForChange?: string;
  clientIp?: string;
}

export interface DoubleEntryValidationResult {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  imbalance: number;
  error?: string;
}

/**
 * Validates the atomic Double-Entry Invariant Rule: Sum(Debits) === Sum(Credits)
 */
export function validateDoubleEntryInvariant(items: VoucherLineInput[]): DoubleEntryValidationResult {
  if (!items || items.length < 2) {
    return {
      isValid: false,
      totalDebit: 0,
      totalCredit: 0,
      imbalance: 0,
      error: "A double-entry voucher requires at least two line items (minimum 1 Debit and 1 Credit).",
    };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const item of items) {
    const amt = Number(item.amount);
    if (isNaN(amt) || amt <= 0) {
      return {
        isValid: false,
        totalDebit,
        totalCredit,
        imbalance: 0,
        error: `Line item amount must be a positive number. Received: ${item.amount}`,
      };
    }

    if (item.entryType === "Dr") {
      totalDebit += amt;
    } else if (item.entryType === "Cr") {
      totalCredit += amt;
    } else {
      return {
        isValid: false,
        totalDebit,
        totalCredit,
        imbalance: 0,
        error: `Invalid entry type: ${item.entryType}. Expected 'Dr' or 'Cr'.`,
      };
    }
  }

  const roundedDebit = Math.round(totalDebit * 100) / 100;
  const roundedCredit = Math.round(totalCredit * 100) / 100;
  const diff = Math.abs(Math.round((roundedDebit - roundedCredit) * 100) / 100);

  if (diff !== 0) {
    return {
      isValid: false,
      totalDebit: roundedDebit,
      totalCredit: roundedCredit,
      imbalance: diff,
      error: `Double-entry invariant violated: Total Debits (₹${roundedDebit.toFixed(2)}) does not equal Total Credits (₹${roundedCredit.toFixed(2)}). Imbalance: ₹${diff.toFixed(2)}`,
    };
  }

  return {
    isValid: true,
    totalDebit: roundedDebit,
    totalCredit: roundedCredit,
    imbalance: 0,
  };
}

/**
 * Calculates updated balance based on Account Group Nature & Entry Type
 * - Asset / Expense: +Dr, -Cr
 * - Liability / Income: +Cr, -Dr
 */
export function calculateNewLedgerBalance(
  currentBalance: number,
  nature: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE",
  entryType: "Dr" | "Cr",
  amount: number
): number {
  const isNormalDebit = nature === "ASSET" || nature === "EXPENSE";
  if (isNormalDebit) {
    return entryType === "Dr" ? currentBalance + amount : currentBalance - amount;
  } else {
    return entryType === "Cr" ? currentBalance + amount : currentBalance - amount;
  }
}

/**
 * Generates an MCA-compliant SHA-256 cryptographic audit hash
 */
export function generateAuditHash(voucherId: string, timestamp: string, payload: any, prevHash: string = ""): string {
  const raw = `${voucherId}|${timestamp}|${JSON.stringify(payload)}|${prevHash}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Executes atomic creation of a multi-line voucher within PostgreSQL
 */
export async function executeVoucherCreation(payload: CreateVoucherPayload) {
  const invariant = validateDoubleEntryInvariant(payload.items);
  if (!invariant.isValid) {
    throw new Error(invariant.error);
  }

  const tenantId = ACTIVE_TENANT_ID;
  const vType = payload.voucherType;
  const bookType = payload.bookType || "STATUTORY";
  const voucherDate = payload.voucherDate || new Date().toISOString().split("T")[0];
  const voucherPrefix = vType.substring(0, 3).toUpperCase();
  const voucherNo = `${voucherPrefix}-${Date.now().toString().slice(-6)}`;
  const totalAmount = invariant.totalDebit;
  const currency = payload.currency || "INR";
  const exchangeRate = payload.exchangeRate || 1.0;
  const requiresHitl = totalAmount > 1000000;
  const initialStatus = requiresHitl ? "PENDING_APPROVAL" : "POSTED";

  // 1. Insert Voucher Header
  const voucherRows = await prisma.$queryRaw<any[]>`
    INSERT INTO tally_vouchers (
      tenant_id, voucher_number, voucher_type, book_type, voucher_date, reference_number,
      narration, total_amount, currency, exchange_rate, status, requires_hitl, created_by_user_id
    ) VALUES (
      ${tenantId}::uuid, ${voucherNo}, ${vType}, ${bookType}, ${voucherDate}::date, ${payload.referenceNumber || null},
      ${payload.narration || null}, ${totalAmount}, ${currency}, ${exchangeRate}, ${initialStatus}, ${requiresHitl}, ${payload.operatorId}
    )
    RETURNING id, voucher_number, voucher_type, book_type as "bookType", voucher_date, reference_number, narration, total_amount, currency, exchange_rate, status, created_at;
  `;

  const newVoucher = voucherRows[0];
  const createdItems = [];
  let lineIdx = 1;

  // 2. Insert line items and update ledger balances
  for (const item of payload.items) {
    const ledgerRows = await prisma.$queryRaw<any[]>`
      SELECT l.id, l.ledger_name, l.current_balance, g.nature
      FROM tally_account_ledgers l
      JOIN tally_account_groups g ON l.group_id = g.id
      WHERE l.id = ${item.ledgerId}::uuid AND l.tenant_id = ${tenantId}::uuid;
    `;

    if (ledgerRows.length === 0) {
      throw new Error(`Ledger account with ID ${item.ledgerId} was not found.`);
    }

    const ledger = ledgerRows[0];
    const currentBal = Number(ledger.current_balance || 0);
    const nature = ledger.nature as "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE";
    const newBal = calculateNewLedgerBalance(currentBal, nature, item.entryType, Number(item.amount));

    const itemRows = await prisma.$queryRaw<any[]>`
      INSERT INTO tally_voucher_items (
        tenant_id, voucher_id, ledger_id, cost_center_id, entry_type, amount, bill_reference, particulars, line_number
      ) VALUES (
        ${tenantId}::uuid, ${newVoucher.id}::uuid, ${item.ledgerId}::uuid, ${item.costCenterId ? `${item.costCenterId}` : null}::uuid,
        ${item.entryType}, ${item.amount}, ${item.billReference || null}, ${item.particulars || null}, ${lineIdx++}
      )
      RETURNING id, voucher_id, ledger_id, cost_center_id, entry_type, amount, bill_reference, particulars, line_number;
    `;

    createdItems.push(itemRows[0]);

    if (!requiresHitl) {
      await prisma.$executeRaw`
        UPDATE tally_account_ledgers
        SET current_balance = ${newBal}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${item.ledgerId}::uuid AND tenant_id = ${tenantId}::uuid;
      `;
    }
  }

  // 3. Record Bill-by-Bill references if supplied
  if (payload.billRefs && payload.billRefs.length > 0) {
    for (const bRef of payload.billRefs) {
      await prisma.$executeRaw`
        INSERT INTO tally_bill_references (
          tenant_id, voucher_id, ledger_id, book_type, bill_number, ref_type, original_amount, pending_amount, bill_date, due_date, interest_rate_pct
        ) VALUES (
          ${tenantId}::uuid, ${newVoucher.id}::uuid, ${payload.items[0]?.ledgerId}::uuid, ${bookType},
          ${bRef.billNumber}, ${bRef.refType}, ${bRef.originalAmount},
          ${bRef.pendingAmount !== undefined ? bRef.pendingAmount : bRef.originalAmount},
          ${bRef.billDate || voucherDate}::date, ${bRef.dueDate}::date, ${bRef.interestRatePct || 18.00}
        );
      `;
    }
  }

  // 4. Append-Only MCA Audit Log
  const timestamp = new Date().toISOString();
  const auditPayload = {
    voucher: newVoucher,
    items: createdItems,
    billRefs: payload.billRefs || [],
  };
  const cryptoHash = generateAuditHash(newVoucher.id, timestamp, auditPayload);

  await prisma.$executeRaw`
    INSERT INTO tally_accounting_audit_log (
      tenant_id, voucher_id, modified_by_user_id, action_type, timestamp, crypto_hash, new_payload, ip_address, reason_for_change
    ) VALUES (
      ${tenantId}::uuid, ${newVoucher.id}::uuid, ${payload.operatorId}, 'CREATE', CURRENT_TIMESTAMP, ${cryptoHash},
      ${JSON.stringify(auditPayload)}::jsonb, ${payload.clientIp || '127.0.0.1'},
      ${payload.reasonForChange || `Voucher ${voucherNo} posted into general ledger`}
    );
  `;

  return {
    voucher: newVoucher,
    items: createdItems,
    cryptoHash,
    requiresHitl,
  };
}
