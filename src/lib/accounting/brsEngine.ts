export interface ParsedBankTransaction {
  transactionDate: string; // YYYY-MM-DD
  valueDate?: string;
  referenceNumber: string;
  description: string;
  entryType: "Dr" | "Cr";
  amount: number;
  balanceAfter?: number;
}

export interface BookVoucherCandidate {
  voucherId: string;
  voucherNumber: string;
  voucherDate: string;
  referenceNumber?: string;
  particulars?: string;
  entryType: "Dr" | "Cr";
  amount: number;
}

export interface FuzzyMatchResult {
  bankTx: ParsedBankTransaction;
  matchedVoucher?: BookVoucherCandidate;
  score: number; // 0 to 100
  matchConfidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  matchReasons: string[];
}

/**
 * Calculates string similarity ratio using Sørensen-Dice coefficient
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const length1 = s1.length - 1;
  const length2 = s2.length - 1;
  if (length1 < 1 || length2 < 1) return 0;

  const bigrams2 = new Map<string, number>();
  for (let i = 0; i < length2; i++) {
    const bigram = s2.substring(i, i + 2);
    bigrams2.set(bigram, (bigrams2.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < length1; i++) {
    const bigram = s1.substring(i, i + 2);
    const count = bigrams2.get(bigram) || 0;
    if (count > 0) {
      bigrams2.set(bigram, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / (length1 + length2);
}

/**
 * Parses Bank Statement CSV Content
 */
export function parseBankStatementCsv(csvText: string): ParsedBankTransaction[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const transactions: ParsedBankTransaction[] = [];
  const header = lines[0].toLowerCase();
  const isHdfc = header.includes("narration") || header.includes("chq/ref");
  const isIcici = header.includes("transaction remarks") || header.includes("cheque no");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").trim());
    if (cols.length < 4) continue;

    let dateStr = cols[0] || "";
    let desc = cols[1] || "";
    let ref = cols[2] || "";
    let debitStr = cols[3] || "0";
    let creditStr = cols[4] || "0";
    let balStr = cols[5] || "0";

    if (isIcici && cols.length >= 6) {
      dateStr = cols[1];
      desc = cols[2];
      ref = cols[3];
      debitStr = cols[4];
      creditStr = cols[5];
      balStr = cols[6] || "0";
    }

    const debit = parseFloat(debitStr.replace(/,/g, "")) || 0;
    const credit = parseFloat(creditStr.replace(/,/g, "")) || 0;
    const balance = parseFloat(balStr.replace(/,/g, "")) || 0;

    const entryType: "Dr" | "Cr" = credit > 0 ? "Cr" : "Dr";
    const amount = credit > 0 ? credit : debit;

    if (amount <= 0) continue;

    let normalizedDate = dateStr;
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3 && parts[2].length === 4) {
        normalizedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    } else if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts[0].length === 2 && parts[2].length === 4) {
        normalizedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }

    transactions.push({
      transactionDate: normalizedDate || new Date().toISOString().split("T")[0],
      referenceNumber: ref || `TXN-${i}`,
      description: desc || "Bank Clearance Transaction",
      entryType,
      amount,
      balanceAfter: balance,
    });
  }

  return transactions;
}

/**
 * 3-Point Fuzzy-Matching Algorithm for Automated Bank Reconciliation
 * Formula: S_total = S_amount (50 pts) + S_date (30 pts) + S_narrative (20 pts)
 */
export function executeFuzzyMatching(
  bankTransactions: ParsedBankTransaction[],
  bookVouchers: BookVoucherCandidate[]
): FuzzyMatchResult[] {
  const matchedBookIds = new Set<string>();
  const results: FuzzyMatchResult[] = [];

  for (const bTx of bankTransactions) {
    let bestMatch: BookVoucherCandidate | null = null;
    let highestScore = 0;
    let bestReasons: string[] = [];

    for (const v of bookVouchers) {
      if (matchedBookIds.has(v.voucherId)) continue;

      let score = 0;
      const reasons: string[] = [];

      // 1. Amount Exact / Tolerance Match (up to 50 Points)
      const amountDiff = Math.abs(bTx.amount - v.amount);
      if (amountDiff <= 0.01) {
        score += 50;
        reasons.push("Exact amount match (50 pts)");
      } else if (amountDiff / bTx.amount <= 0.01) {
        score += 35;
        reasons.push("Amount within 1% tolerance (35 pts)");
      }

      // 2. Date Window Tolerance (up to 30 Points)
      const bDate = new Date(bTx.transactionDate).getTime();
      const vDate = new Date(v.voucherDate).getTime();
      const dayDiff = Math.abs((bDate - vDate) / (1000 * 60 * 60 * 24));

      if (dayDiff === 0) {
        score += 30;
        reasons.push("Same day transaction (30 pts)");
      } else if (dayDiff <= 2) {
        score += 20;
        reasons.push(`Transaction within ${Math.round(dayDiff)} days (20 pts)`);
      } else if (dayDiff <= 5) {
        score += 10;
        reasons.push(`Transaction within ${Math.round(dayDiff)} days (10 pts)`);
      }

      // 3. Reference / Narrative Similarity (up to 20 Points)
      const refSim = calculateStringSimilarity(bTx.referenceNumber, v.referenceNumber || "");
      const descSim = calculateStringSimilarity(bTx.description, v.particulars || "");
      const maxTextSim = Math.max(refSim, descSim);

      if (maxTextSim > 0.8) {
        score += 20;
        reasons.push("High reference string match (20 pts)");
      } else if (maxTextSim > 0.5) {
        score += 10;
        reasons.push("Partial narrative match (10 pts)");
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = v;
        bestReasons = reasons;
      }
    }

    let confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE" = "NONE";
    if (highestScore >= 80) confidence = "HIGH";
    else if (highestScore >= 60) confidence = "MEDIUM";
    else if (highestScore > 0) confidence = "LOW";

    if (bestMatch && highestScore >= 70) {
      matchedBookIds.add(bestMatch.voucherId);
    }

    results.push({
      bankTx: bTx,
      matchedVoucher: bestMatch || undefined,
      score: highestScore,
      matchConfidence: confidence,
      matchReasons: bestReasons,
    });
  }

  return results;
}

/**
 * Generates Corporate NEFT/RTGS Batch Payout CSV File
 */
export function generateCorporatePayoutCsv(
  payments: {
    beneficiaryName: string;
    accountNumber: string;
    ifscCode: string;
    amount: number;
    paymentRef: string;
    remarks: string;
  }[]
): string {
  const headers = ["Beneficiary Name", "Account Number", "IFSC Code", "Amount (INR)", "Payment Mode", "Customer Reference", "Remarks"];
  const rows = payments.map((p) => [
    `"${p.beneficiaryName.replace(/"/g, '""')}"`,
    `"${p.accountNumber}"`,
    `"${p.ifscCode.toUpperCase()}"`,
    p.amount.toFixed(2),
    p.amount >= 200000 ? "RTGS" : "NEFT",
    `"${p.paymentRef}"`,
    `"${p.remarks.replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
