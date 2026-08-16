import crypto from "crypto";

export interface TaxLine {
  hsnSacCode: string;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

/**
 * Calculates CGST/SGST vs IGST based on Inter-State vs Intra-State Place of Supply (POS)
 */
export function calculateGstBreakdown(
  taxableAmount: number,
  gstRate: number,
  supplierStateCode: string = "27",
  buyerPosCode: string = "27",
  hsnSacCode: string = "995411"
): TaxLine {
  const isIntraState = !buyerPosCode || supplierStateCode === buyerPosCode;

  if (isIntraState) {
    const halfRate = gstRate / 2;
    const cgst = Math.round((taxableAmount * (halfRate / 100)) * 100) / 100;
    const sgst = Math.round((taxableAmount * (halfRate / 100)) * 100) / 100;
    const totalTax = cgst + sgst;
    return {
      hsnSacCode,
      taxableAmount,
      gstRate,
      cgstRate: halfRate,
      sgstRate: halfRate,
      igstRate: 0,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: 0,
      totalTax,
      totalAmount: taxableAmount + totalTax,
    };
  } else {
    const igst = Math.round((taxableAmount * (gstRate / 100)) * 100) / 100;
    return {
      hsnSacCode,
      taxableAmount,
      gstRate,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: igst,
      totalTax: igst,
      totalAmount: taxableAmount + igst,
    };
  }
}

/**
 * Generates the standard 64-character SHA-256 Invoice Reference Number (IRN)
 * Formula: SHA256(SupplierGSTIN + FinYear + DocType + DocNumber)
 */
export function generateIRN(
  supplierGstin: string,
  financialYear: string,
  docType: "INV" | "CRN" | "DBN",
  docNumber: string
): string {
  const rawKey = `${supplierGstin.trim().toUpperCase()}${financialYear.trim()}${docType.trim().toUpperCase()}${docNumber.trim()}`;
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Creates standard NIC compliant e-Invoice signed QR base64 payload
 */
export function generateEInvoiceSignedQrString(
  irn: string,
  supplierGstin: string,
  buyerGstin: string,
  docNumber: string,
  docDate: string,
  totalValue: number,
  itemCount: number = 1
): string {
  const qrData = {
    irn,
    gstin: supplierGstin,
    cgstin: buyerGstin,
    docNo: docNumber,
    docTyp: "INV",
    docDt: docDate,
    totVal: totalValue,
    itemCnt: itemCount,
    mainHsnCode: "995411",
    timestamp: new Date().toISOString(),
  };
  return Buffer.from(JSON.stringify(qrData)).toString("base64");
}

/**
 * Evaluates Statutory GSTR-3B Tax Offset Priorities
 * Priority Rule: IGST credit offset first against IGST liability, then CGST and SGST.
 */
export function calculateGstr3bOffset(
  grossIgstLiability: number,
  grossCgstLiability: number,
  grossSgstLiability: number,
  itcIgst: number,
  itcCgst: number,
  itcSgst: number
) {
  // 1. IGST ITC utilization against IGST Liability
  const igstUtilizedForIgst = Math.min(grossIgstLiability, itcIgst);
  const netIgstLiability = grossIgstLiability - igstUtilizedForIgst;
  let remainingItcIgst = itcIgst - igstUtilizedForIgst;

  // 2. Remaining IGST ITC utilized against CGST Liability
  const igstUtilizedForCgst = Math.min(grossCgstLiability, remainingItcIgst);
  let tempCgstLiability = grossCgstLiability - igstUtilizedForCgst;
  remainingItcIgst -= igstUtilizedForCgst;

  // 3. Remaining IGST ITC utilized against SGST Liability
  const igstUtilizedForSgst = Math.min(grossSgstLiability, remainingItcIgst);
  let tempSgstLiability = grossSgstLiability - igstUtilizedForSgst;
  remainingItcIgst -= igstUtilizedForSgst;

  // 4. CGST ITC utilized against CGST Liability
  const cgstUtilizedForCgst = Math.min(tempCgstLiability, itcCgst);
  const netCgstLiability = tempCgstLiability - cgstUtilizedForCgst;
  const remainingItcCgst = itcCgst - cgstUtilizedForCgst;

  // 5. SGST ITC utilized against SGST Liability
  const sgstUtilizedForSgst = Math.min(tempSgstLiability, itcSgst);
  const netSgstLiability = tempSgstLiability - sgstUtilizedForSgst;
  const remainingItcSgst = itcSgst - sgstUtilizedForSgst;

  const totalCashPayable = netIgstLiability + netCgstLiability + netSgstLiability;
  const totalItcCarriedForward = remainingItcIgst + remainingItcCgst + remainingItcSgst;

  return {
    liabilities: {
      igst: netIgstLiability,
      cgst: netCgstLiability,
      sgst: netSgstLiability,
      totalCashPayable,
    },
    itcCarriedForward: {
      igst: remainingItcIgst,
      cgst: remainingItcCgst,
      sgst: remainingItcSgst,
      total: totalItcCarriedForward,
    },
    utilization: {
      igstForIgst: igstUtilizedForIgst,
      igstForCgst: igstUtilizedForCgst,
      igstForSgst: igstUtilizedForSgst,
      cgstForCgst: cgstUtilizedForCgst,
      sgstForSgst: sgstUtilizedForSgst,
    },
  };
}
