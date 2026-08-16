import { BookScope } from "@/lib/accounting/multiBookScope";

export interface TallyVoucher {
  id: string;
  voucherNumber: string;
  voucherType: string;
  bookType?: string;
  postingDate: string;
  referenceNumber?: string;
  narration: string;
  totalAmount: number;
  currency?: string;
  status: string;
  requiresHitl: boolean;
  debitLedgerName?: string;
  creditLedgerName?: string;
  entries?: {
    id: string;
    ledgerId: string;
    ledgerName: string;
    costCenterId?: string;
    entryType: "Dr" | "Cr";
    debitAmount: number;
    creditAmount: number;
    billReference?: string;
    particulars?: string;
  }[];
}

export interface TallyLedger {
  id: string;
  code: string;
  name: string;
  primaryGroup: string;
  subGroup: string;
  groupCode: string;
  group: string;
  nature: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE";
  ledgerName: string;
  ledgerType: string;
  openingBalance: number;
  currentBalance: number;
  balance: number;
  type: "Dr" | "Cr";
  bookType: "STATUTORY" | "INTERNAL";
  currencyCode: string;
  gstin?: string;
  pan?: string;
  hsnSacCode?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  isMsme: boolean;
  msmeCategory?: string;
}

export interface GstSummaryResponse {
  gstr1: {
    totalOutwardSupplies: number;
    invoices: {
      id: string;
      voucherNumber: string;
      voucherDate: string;
      totalAmount: number;
      irn: string | null;
    }[];
  };
  gstr3b: {
    table31: {
      taxableSupplies: number;
      cgst: number;
      sgst: number;
      igst: number;
    };
    table4_itc: {
      eligibleItcTotal: number;
      itcCgst: number;
      itcSgst: number;
      itcIgst: number;
    };
    taxOffset: {
      liabilities: {
        igst: number;
        cgst: number;
        sgst: number;
        totalCashPayable: number;
      };
      itcCarriedForward: {
        igst: number;
        cgst: number;
        sgst: number;
        total: number;
      };
    };
  };
  gstr2bReconciliations: {
    id: string;
    vendorGstin: string;
    invoiceNumber: string;
    invoiceDate: string;
    taxableValue: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    itcEligibility: string;
    imsAction: "ACCEPT" | "REJECT" | "PENDING";
    reconciliationStatus: string;
  }[];
  eInvoices: {
    id: string;
    voucherNumber: string;
    voucherDate: string;
    totalAmount: number;
    irn: string;
    ackNumber: string;
    signedQrCode: string;
    ewayBillNumber: string;
    status: string;
  }[];
  gstr1SalesTotal: number;
  gstr3bTaxLiability: number;
  gstr2aItcAvailable: number;
  itcMismatchCount: number;
  eInvoicesGeneratedCount: number;
  pendingIrnCount: number;
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
  name: string;
  location: string;
  supervisor: string;
  capacityUtilizationPct: number;
  activeItemsCount: number;
  valuationInr: number;
}

export interface StockItemDetail {
  id: string;
  itemCode: string;
  itemName: string;
  groupName: string;
  uom: string;
  hsnCode: string;
  currentStock: number;
  reorderLevel: number;
  valuationMethod: string;
  standardRate: number;
  totalValuation: number;
  isShortfall: boolean;
}

export interface BomRecipe {
  id: string;
  bomName: string;
  finishedProductName: string;
  finishedItemId: string;
  yieldQuantity: number;
  uom: string;
  componentsCount: number;
  components: {
    componentItemId: string;
    componentName: string;
    quantity: number;
    uom: string;
    currentStock: number;
    scrapRatePct: number;
  }[];
}

export interface BankBrsResponse {
  accounts: {
    id: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    bookBalance: number;
    bankStatementBalance: number;
    unreconciledDr: number;
    unreconciledCr: number;
    lastReconciledDate: string;
  }[];
  unmatchedStatements: {
    id: string;
    date: string;
    reference: string;
    description: string;
    withdrawalDebit: number;
    depositCredit: number;
    status: string;
    matchedVoucherNumber: string;
    matchScore: number;
  }[];
  bookEntries: {
    voucherId: string;
    voucherNumber: string;
    voucherDate: string;
    referenceNumber: string;
    particulars: string;
    entryType: "Dr" | "Cr";
    amount: number;
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
    nature: string;
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
  totalAssets: number;
  totalLiabilities: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  cashRunwayMonths: number;
  netWorkingCapital: number;
}

export interface CashVaultResponse {
  activeSession: any | null;
  history: {
    id: string;
    date: string;
    cashierName: string;
    openingBalance: number;
    physicalCountedTotal: number;
    systemExpectedTotal: number;
    varianceAmount: number;
    status: string;
    remarks: string;
    createdAt: string;
    closedAt: string | null;
  }[];
  systemExpectedCash: number;
  cashLedgers: {
    id: string;
    name: string;
    balance: number;
  }[];
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

  async fetchVouchers(bookScope: BookScope = "STATUTORY"): Promise<TallyVoucher[]> {
    return this.request<TallyVoucher[]>(`/api/v1/finance/tally/vouchers?bookScope=${bookScope}`);
  }

  async createVoucher(payload: {
    voucherType: string;
    bookType?: "STATUTORY" | "INTERNAL";
    postingDate?: string;
    narration: string;
    debitLedgerId?: string;
    creditLedgerId?: string;
    totalAmount?: number;
    billNumber?: string;
    billReferenceType?: string;
    costCenterId?: string;
    items?: any[];
    auditReason?: string;
  }): Promise<any> {
    return this.request<any>("/api/v1/finance/tally/vouchers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async fetchChartOfAccounts(bookScope: BookScope = "STATUTORY"): Promise<{
    data: TallyLedger[];
    groups: any[];
    costCenters: any[];
  }> {
    const res = await fetch(`/api/v1/finance/tally/chart-of-accounts?bookScope=${bookScope}`, {
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "Failed to fetch Chart of Accounts");
    }
    return { data: json.data || [], groups: json.groups || [], costCenters: json.costCenters || [] };
  }

  async createLedger(payload: {
    name: string;
    groupCode?: string;
    groupId?: string;
    bookType?: "STATUTORY" | "INTERNAL";
    balance?: number;
    type?: "Dr" | "Cr";
    gstin?: string;
    pan?: string;
    hsnSacCode?: string;
    bankAccountNumber?: string;
    bankIfscCode?: string;
    isMsme?: boolean;
    msmeCategory?: string;
  }): Promise<TallyLedger> {
    return this.request<TallyLedger>("/api/v1/finance/tally/chart-of-accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async createGroup(payload: { newGroupName: string; newGroupNature: string; parentGroupId?: string }): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/chart-of-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CREATE_GROUP", ...payload }),
    });
    return res.json();
  }

  async createCostCenter(payload: { centerName: string; centerCategory: string }): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/chart-of-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CREATE_COST_CENTER", ...payload }),
    });
    return res.json();
  }

  async fetchGstSummary(): Promise<GstSummaryResponse> {
    return this.request<GstSummaryResponse>("/api/v1/finance/tally/statutory/gst");
  }

  async updateImsAction(reconciliationId: string, imsAction: "ACCEPT" | "REJECT" | "PENDING"): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/statutory/gst", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "UPDATE_IMS_ACTION", reconciliationId, imsAction }),
    });
    return res.json();
  }

  async generateEInvoice(payload: {
    voucherId?: string;
    docNumber: string;
    docDate?: string;
    totalAmount?: number;
  }): Promise<{ irn: string; eWayBillNumber: string; ackNumber: string; signedQrCode: string }> {
    return this.request<{ irn: string; eWayBillNumber: string; ackNumber: string; signedQrCode: string }>(
      "/api/v1/finance/tally/statutory/gst",
      {
        method: "POST",
        body: JSON.stringify({ action: "GENERATE_E_INVOICE", ...payload }),
      }
    );
  }

  async fetchTdsMsmeSummary(): Promise<TdsMsmeResponse> {
    return this.request<TdsMsmeResponse>("/api/v1/finance/tally/statutory/tds-msme");
  }

  async createMsmeRecord(payload: {
    vendorName: string;
    msmeCategory?: string;
    invoiceNumber: string;
    amount: number;
    dueDate?: string;
    reasonForChange?: string;
  }): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/statutory/tds-msme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async fetchGodowns(): Promise<{ godowns: GodownItem[]; stockItems: StockItemDetail[]; summary: any }> {
    return this.request<{ godowns: GodownItem[]; stockItems: StockItemDetail[]; summary: any }>(
      "/api/v1/finance/tally/inventory/godowns"
    );
  }

  async createGodown(payload: { godownName: string; locationAddress: string }): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/inventory/godowns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CREATE_GODOWN", ...payload }),
    });
    return res.json();
  }

  async createStockItem(payload: {
    itemName: string;
    uom: string;
    hsnCode: string;
    gstRate: number;
    standardRate: number;
    currentStock: number;
    reorderLevel: number;
    valuationMethod: string;
  }): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/inventory/godowns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CREATE_STOCK_ITEM", ...payload }),
    });
    return res.json();
  }

  async fetchBomRecipes(): Promise<BomRecipe[]> {
    return this.request<BomRecipe[]>("/api/v1/finance/tally/inventory/bom");
  }

  async createBomRecipe(payload: {
    bomName: string;
    finishedItemId: string;
    yieldQuantity: number;
    components: { componentItemId: string; quantity: number; scrapRatePct: number }[];
  }): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/inventory/bom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CREATE_BOM", ...payload }),
    });
    return res.json();
  }

  async executeManufacturingJournal(bomId: string, targetProductionQty: number): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/inventory/bom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "EXECUTE_MANUFACTURING_JOURNAL", bomId, targetProductionQty }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to execute manufacturing journal");
    return json;
  }

  async fetchBankingBrs(): Promise<BankBrsResponse> {
    return this.request<BankBrsResponse>("/api/v1/finance/tally/banking/e-brs");
  }

  async uploadBankStatementCsv(bankLedgerId: string, fileName: string, csvContent: string): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/banking/e-brs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "UPLOAD_STATEMENT_CSV", bankLedgerId, fileName, csvContent }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to upload bank statement");
    return json;
  }

  async runAutoReconcile(): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/banking/e-brs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "AUTO_RECONCILE" }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to execute auto reconciliation");
    return json;
  }

  async exportPayoutBatchCsv(): Promise<{ csvData: string; fileName: string }> {
    const res = await fetch("/api/v1/finance/tally/banking/e-brs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "EXPORT_PAYOUT_BATCH" }),
    });
    const json = await res.json();
    return json;
  }

  async fetchCashVault(): Promise<CashVaultResponse> {
    return this.request<CashVaultResponse>("/api/v1/finance/tally/vault");
  }

  async openCashVaultSession(cashierName: string, openingBalance: number): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "OPEN_SESSION", cashierName, openingBalance }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to open cash vault session");
    return json;
  }

  async closeCashVaultSession(payload: {
    sessionId: string;
    counts: any;
    systemExpectedBalance: number;
    remarks?: string;
  }): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CLOSE_SESSION", ...payload }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to close cash vault session");
    return json;
  }

  async fetchRegulatoryRules(): Promise<any> {
    return this.request<any>("/api/v1/finance/tally/regulatory");
  }

  async executeFinancialTool(toolType: string, payload: any): Promise<any> {
    const res = await fetch("/api/v1/finance/tally/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolType, ...payload }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to calculate tool formula");
    return json.result;
  }

  async fetchFinancialReports(bookScope: BookScope = "STATUTORY"): Promise<FinancialReportsResponse> {
    return this.request<FinancialReportsResponse>(`/api/v1/finance/tally/reports/financials?bookScope=${bookScope}`);
  }

  async fetchPendingApprovals(): Promise<TallyVoucher[]> {
    const vouchers = await this.fetchVouchers("BOTH");
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
