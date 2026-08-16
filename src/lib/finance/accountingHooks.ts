import { executeVoucherCreation } from "@/lib/accounting/voucherEngine";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export interface CrmBookingEvent {
  bookingId: string;
  customerName: string;
  plotNumber: string;
  tokenAmount: number;
  paymentMode: "BANK_TRANSFER" | "CHEQUE" | "ONLINE" | "CASH";
  operatorId: string;
}

export interface GrnLineItem {
  itemId?: string;
  isManualLine: boolean;
  customDescription?: string;
  expenseLedgerId?: string;
  expenseLedgerName?: string;
  acceptedQty: number;
  rate: number;
}

export interface GrnApprovalEvent {
  grnId: string;
  poNumber: string;
  vendorName: string;
  godownId: string;
  billAmount: number;
  gstAmount: number;
  items: GrnLineItem[];
  operatorId: string;
}

export interface WbsMilestoneEvent {
  claimId: string;
  wbsNodeId: string;
  contractorName: string;
  verifiedPhysicalPct: number;
  payableAmount: number;
  operatorId: string;
}

export interface PayrollRunEvent {
  payrollRunId: string;
  period: string;
  totalGrossSalary: number;
  totalPfDeduction: number;
  totalTdsDeduction: number;
  netPayoutAmount: number;
  bankLedgerId: string;
  operatorId: string;
}

/**
 * CRM Booking Event Hook: Auto-creates advance receipt voucher in General Ledger
 */
export async function onCrmBookingFinalized(event: CrmBookingEvent) {
  const tenantId = ACTIVE_TENANT_ID;

  // Find Bank / Cash ledger and Customer Receivables ledger
  const bankLedger = await prisma.$queryRaw<any[]>`
    SELECT l.id FROM tally_account_ledgers l
    JOIN tally_account_groups g ON l.group_id = g.id
    WHERE l.tenant_id = ${tenantId}::uuid AND g.group_code = 'GRP-100'
    LIMIT 1;
  `;

  const customerLedger = await prisma.$queryRaw<any[]>`
    SELECT l.id FROM tally_account_ledgers l
    JOIN tally_account_groups g ON l.group_id = g.id
    WHERE l.tenant_id = ${tenantId}::uuid AND g.group_code = 'GRP-200'
    LIMIT 1;
  `;

  if (!bankLedger[0] || !customerLedger[0]) {
    throw new Error("Unable to post automated booking receipt: Default Bank or Customer ledger accounts are missing.");
  }

  const result = await executeVoucherCreation({
    voucherType: "RECEIPT",
    bookType: event.paymentMode === "CASH" ? "INTERNAL" : "STATUTORY",
    voucherDate: new Date().toISOString().split("T")[0],
    referenceNumber: `BOOKING-${event.bookingId.substring(0, 8)}`,
    narration: `Advance Token Receipt for Unit/Plot ${event.plotNumber} - Customer: ${event.customerName}`,
    items: [
      {
        ledgerId: bankLedger[0].id,
        entryType: "Dr",
        amount: event.tokenAmount,
        particulars: `Token deposit via ${event.paymentMode}`,
      },
      {
        ledgerId: customerLedger[0].id,
        entryType: "Cr",
        amount: event.tokenAmount,
        particulars: `Customer advance for Unit ${event.plotNumber}`,
        billReference: `TOKEN-${event.plotNumber}`,
      },
    ],
    billRefs: [
      {
        billNumber: `TOKEN-${event.plotNumber}`,
        refType: "ADVANCE",
        originalAmount: event.tokenAmount,
        dueDate: new Date().toISOString().split("T")[0],
      },
    ],
    operatorId: event.operatorId,
  });

  return { success: true, voucher: result.voucher };
}

/**
 * Procurement GRN Hook: Auto-creates Purchase Voucher and records stock allocation
 */
export async function onGrnApproved(event: GrnApprovalEvent) {
  const tenantId = ACTIVE_TENANT_ID;

  // Find Stock / Direct Expense ledger and Creditor ledger
  const stockLedger = await prisma.$queryRaw<any[]>`
    SELECT l.id FROM tally_account_ledgers l
    JOIN tally_account_groups g ON l.group_id = g.id
    WHERE l.tenant_id = ${tenantId}::uuid AND g.group_code IN ('GRP-210', 'GRP-600')
    LIMIT 1;
  `;

  const creditorLedger = await prisma.$queryRaw<any[]>`
    SELECT l.id FROM tally_account_ledgers l
    JOIN tally_account_groups g ON l.group_id = g.id
    WHERE l.tenant_id = ${tenantId}::uuid AND g.group_code = 'GRP-300'
    LIMIT 1;
  `;

  if (!stockLedger[0] || !creditorLedger[0]) {
    throw new Error("Unable to post automated purchase voucher: Stock Assets or Creditors ledger accounts are missing.");
  }

  const grandTotal = event.billAmount + event.gstAmount;

  const result = await executeVoucherCreation({
    voucherType: "PURCHASE",
    bookType: "STATUTORY",
    voucherDate: new Date().toISOString().split("T")[0],
    referenceNumber: `GRN-${event.grnId.substring(0, 8)}`,
    narration: `Purchase Invoice via GRN ${event.grnId} (PO #${event.poNumber}) from ${event.vendorName}`,
    items: [
      {
        ledgerId: stockLedger[0].id,
        entryType: "Dr",
        amount: grandTotal,
        particulars: `Goods Receipt Note #${event.grnId}`,
      },
      {
        ledgerId: creditorLedger[0].id,
        entryType: "Cr",
        amount: grandTotal,
        particulars: `Vendor payable to ${event.vendorName}`,
        billReference: `GRN-${event.grnId.substring(0, 8)}`,
      },
    ],
    billRefs: [
      {
        billNumber: `GRN-${event.grnId.substring(0, 8)}`,
        refType: "NEW_REF",
        originalAmount: grandTotal,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    ],
    operatorId: event.operatorId,
  });

  return { success: true, voucher: result.voucher };
}

/**
 * Construction Milestone Hook: Connects WBS progress claims to general ledger
 */
export async function onWbsMilestoneVerified(event: WbsMilestoneEvent) {
  const tenantId = ACTIVE_TENANT_ID;

  const expenseLedger = await prisma.$queryRaw<any[]>`
    SELECT l.id FROM tally_account_ledgers l
    JOIN tally_account_groups g ON l.group_id = g.id
    WHERE l.tenant_id = ${tenantId}::uuid AND g.group_code = 'GRP-600'
    LIMIT 1;
  `;

  const creditorLedger = await prisma.$queryRaw<any[]>`
    SELECT l.id FROM tally_account_ledgers l
    JOIN tally_account_groups g ON l.group_id = g.id
    WHERE l.tenant_id = ${tenantId}::uuid AND g.group_code = 'GRP-300'
    LIMIT 1;
  `;

  if (!expenseLedger[0] || !creditorLedger[0]) {
    throw new Error("Unable to post milestone claim: Expense or Creditor ledger accounts are missing.");
  }

  const result = await executeVoucherCreation({
    voucherType: "JOURNAL",
    bookType: "STATUTORY",
    voucherDate: new Date().toISOString().split("T")[0],
    referenceNumber: `WBS-CLAIM-${event.claimId.substring(0, 8)}`,
    narration: `Contractor Progress Claim (${event.verifiedPhysicalPct}% Verified) - Node ${event.wbsNodeId} by ${event.contractorName}`,
    items: [
      {
        ledgerId: expenseLedger[0].id,
        entryType: "Dr",
        amount: event.payableAmount,
        particulars: `Work in Progress - Node ${event.wbsNodeId}`,
      },
      {
        ledgerId: creditorLedger[0].id,
        entryType: "Cr",
        amount: event.payableAmount,
        particulars: `Contractor payable to ${event.contractorName}`,
        billReference: `WBS-${event.claimId.substring(0, 8)}`,
      },
    ],
    operatorId: event.operatorId,
  });

  return { success: true, voucher: result.voucher };
}

/**
 * Payroll Run Hook: Auto-posts monthly salary disbursal vouchers
 */
export async function onPayrollRunExecuted(event: PayrollRunEvent) {
  const tenantId = ACTIVE_TENANT_ID;

  const salaryExpenseLedger = await prisma.$queryRaw<any[]>`
    SELECT l.id FROM tally_account_ledgers l
    JOIN tally_account_groups g ON l.group_id = g.id
    WHERE l.tenant_id = ${tenantId}::uuid AND g.group_code IN ('GRP-610', 'GRP-600')
    LIMIT 1;
  `;

  if (!salaryExpenseLedger[0]) {
    throw new Error("Unable to post payroll: Salary Expense ledger account is missing.");
  }

  const result = await executeVoucherCreation({
    voucherType: "PAYMENT",
    bookType: "STATUTORY",
    voucherDate: new Date().toISOString().split("T")[0],
    referenceNumber: `PAYROLL-${event.period}`,
    narration: `Monthly Salary Disbursal for Period ${event.period}`,
    items: [
      {
        ledgerId: salaryExpenseLedger[0].id,
        entryType: "Dr",
        amount: event.totalGrossSalary,
        particulars: `Gross salaries for ${event.period}`,
      },
      {
        ledgerId: event.bankLedgerId,
        entryType: "Cr",
        amount: event.netPayoutAmount,
        particulars: `Bank salary transfer for ${event.period}`,
      },
    ],
    operatorId: event.operatorId,
  });

  return { success: true, voucher: result.voucher };
}
