export interface TallyVoucher {
  id: string;
  voucherNumber: string;
  voucherType: string;
  postingDate: string;
  narration: string;
  totalAmount: number;
  status: string;
  requiresHitl: boolean;
  isOptional: boolean;
  isReversing: boolean;
  debitLedgerName?: string;
  creditLedgerName?: string;
  entries?: TallyVoucherEntry[];
}

export interface TallyVoucherEntry {
  id: string;
  ledgerId: string;
  ledgerName: string;
  costCenterId?: string;
  debitAmount: number;
  creditAmount: number;
  fxRate: number;
  billReferenceType?: string;
  billNumber?: string;
}

export interface TallyLedger {
  id: string;
  primaryGroup: string;
  subGroup: string;
  ledgerName: string;
  ledgerType: string;
  openingBalance: number;
  currentBalance: number;
  currencyCode: string;
  gstin?: string;
  pan?: string;
}

export interface GstSummaryResponse {
  gstr1SalesTotal: number;
  gstr3bTaxLiability: number;
  gstr2aItcAvailable: number;
  itcMismatchCount: number;
  eInvoicesGeneratedCount: number;
  pendingIrnCount: number;
  mismatches: {
    id: string;
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    portalItcAmount: number;
    booksItcAmount: number;
    varianceAmount: number;
    status: string;
  }[];
}

export interface TdsMsmeResponse {
  tdsSummary: {
    sectionCode: string;
    sectionDescription: string;
    thresholdLimit: number;
    utilizedAmount: number;
    tdsDeductedAmount: number;
    complianceStatus: string;
  }[];
  msmeVendors: {
    id: string;
    vendorName: string;
    msmeCategory: string;
    agreementExists: boolean;
    paymentWindowDays: number;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    amount: number;
    overdueAmount: number;
    taxDisallowanceRisk: boolean;
    status: string;
  }[];
  mcaLogs: {
    id: string;
    voucherReference: string;
    actionType: string;
    timestamp: string;
    userId: string;
    ipAddress: string;
    fieldChangesSummary: string;
  }[];
}

export interface GodownItem {
  id: string;
  godownName: string;
  parentGodownName: string;
  rackLocation: string;
  binNumber: string;
  stockBatches: {
    id: string;
    itemName: string;
    batchNumber: string;
    quantity: number;
    unitCost: number;
    manufactureDate: string;
    expiryDate: string;
    valuationMethod: string;
  }[];
}

export interface BomRecipe {
  id: string;
  recipeName: string;
  finishedGoodsItemName: string;
  componentItemName: string;
  standardQuantity: number;
  overheadCostAllocationPct: number;
  scrapRatePct: number;
}

export interface BankBrsResponse {
  bankLedgerBalance: number;
  passbookBalance: number;
  unreconciledChequesCount: number;
  matchedTransactionsCount: number;
  cashInHandAmount: number;
  brsItems: {
    id: string;
    transactionDate: string;
    description: string;
    referenceNumber: string;
    amount: number;
    type: string;
    status: string;
    matchConfidencePct: number;
  }[];
}

export interface FinancialReportsResponse {
  balanceSheet: {
    category: string;
    subGroup: string;
    ledgerName: string;
    amount: number;
  }[];
  profitAndLoss: {
    type: string;
    category: string;
    ledgerName: string;
    amount: number;
  }[];
  trialBalance: {
    ledgerName: string;
    primaryGroup: string;
    debitAmount: number;
    creditAmount: number;
  }[];
  agingReport: {
    partyName: string;
    currentAmount: number;
    days30: number;
    days60: number;
    days90: number;
    days90Plus: number;
  }[];
  cashRunwayMonths: number;
  netWorkingCapital: number;
}

class TallyErpApiService {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "Failed to execute Tally ERP operation");
    }

    return json.data as T;
  }

  async fetchVouchers(): Promise<TallyVoucher[]> {
    return this.request<TallyVoucher[]>("/api/v1/finance/tally/vouchers");
  }

  async createVoucher(payload: {
    voucherType: string;
    postingDate?: string;
    narration: string;
    debitLedgerId: string;
    creditLedgerId: string;
    totalAmount: number;
    billReferenceType?: string;
    billNumber?: string;
    costCenterId?: string;
  }): Promise<TallyVoucher> {
    return this.request<TallyVoucher>("/api/v1/finance/tally/vouchers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async fetchChartOfAccounts(): Promise<TallyLedger[]> {
    return this.request<TallyLedger[]>("/api/v1/finance/tally/chart-of-accounts");
  }

  async createLedger(payload: {
    primaryGroup: string;
    subGroup: string;
    ledgerName: string;
    ledgerType: string;
    openingBalance?: number;
    currencyCode?: string;
    gstin?: string;
    pan?: string;
  }): Promise<TallyLedger> {
    return this.request<TallyLedger[]>("/api/v1/finance/tally/chart-of-accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(() => this.fetchChartOfAccounts().then((items) => items[items.length - 1]));
  }

  async fetchGstSummary(): Promise<GstSummaryResponse> {
    return this.request<GstSummaryResponse>("/api/v1/finance/tally/statutory/gst");
  }

  async generateEInvoice(payload: { invoiceNumber: string }): Promise<{ irn: string; eWayBillNumber: string }> {
    return this.request<{ irn: string; eWayBillNumber: string }>("/api/v1/finance/tally/statutory/gst", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async fetchTdsMsmeSummary(): Promise<TdsMsmeResponse> {
    return this.request<TdsMsmeResponse>("/api/v1/finance/tally/statutory/tds-msme");
  }

  async fetchGodowns(): Promise<GodownItem[]> {
    return this.request<GodownItem[]>("/api/v1/finance/tally/inventory/godowns");
  }

  async createStockJournal(payload: {
    sourceGodownId: string;
    targetGodownId: string;
    itemName: string;
    quantity: number;
    batchNumber: string;
    unitCost: number;
  }): Promise<{ stockJournalRef: string }> {
    return this.request<{ stockJournalRef: string }>("/api/v1/finance/tally/inventory/godowns", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async fetchBomRecipes(): Promise<BomRecipe[]> {
    return this.request<BomRecipe[]>("/api/v1/finance/tally/inventory/bom");
  }

  async postProductionVoucher(payload: {
    recipeId: string;
    producedQuantity: number;
  }): Promise<{ productionVoucherRef: string }> {
    return this.request<{ productionVoucherRef: string }>("/api/v1/finance/tally/inventory/bom", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async fetchBankingBrs(): Promise<BankBrsResponse> {
    return this.request<BankBrsResponse>("/api/v1/finance/tally/banking/e-brs");
  }

  async uploadBankStatement(payload: { filename: string; rawData: string }): Promise<{ processedCount: number; matchedCount: number }> {
    return this.request<{ processedCount: number; matchedCount: number }>("/api/v1/finance/tally/banking/e-brs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async fetchFinancialReports(): Promise<FinancialReportsResponse> {
    return this.request<FinancialReportsResponse>("/api/v1/finance/tally/reports/financials");
  }

  async fetchPendingApprovals(): Promise<TallyVoucher[]> {
    const vouchers = await this.fetchVouchers();
    return vouchers.filter((v) => v.requiresHitl || v.status === "PENDING_APPROVAL");
  }

  async authorizeVoucher(voucherId: string): Promise<void> {
    await this.request<{ success: boolean }>("/api/v1/finance/tally/vouchers", {
      method: "PATCH",
      body: JSON.stringify({ voucherId, action: "AUTHORIZE" }),
    });
  }

  async rejectVoucher(voucherId: string): Promise<void> {
    await this.request<{ success: boolean }>("/api/v1/finance/tally/vouchers", {
      method: "PATCH",
      body: JSON.stringify({ voucherId, action: "REJECT" }),
    });
  }
}

export const tallyErpApi = new TallyErpApiService();
