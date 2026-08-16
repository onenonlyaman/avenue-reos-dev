"use client";

import React, { useState, useEffect } from "react";
import { tallyErpApi, GstSummaryResponse, TdsMsmeResponse } from "@/services/tallyErpApi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { RecordFormModal, RecordField } from "@/components/core/RecordFormModal";
import { toast } from "@/components/ui/sonner";
import { FileCheck, ShieldCheck, QrCode, CheckCircle2, XCircle, Clock, AlertTriangle, Plus } from "lucide-react";

const MSME_FIELDS: RecordField[] = [
  {
    name: "vendorName",
    label: "MSME Vendor / Supplier Name",
    type: "text",
    required: true,
    placeholder: "e.g. Apex Hardware & Electricals (Micro)",
  },
  {
    name: "msmeCategory",
    label: "Enterprise Classification",
    type: "select",
    required: true,
    options: [
      { value: "Micro Enterprise", label: "Micro Enterprise (45-Day statutory rule)" },
      { value: "Small Enterprise", label: "Small Enterprise (45-Day statutory rule)" },
      { value: "Medium Enterprise", label: "Medium Enterprise" },
    ],
    halfWidth: true,
  },
  {
    name: "invoiceNumber",
    label: "Invoice Reference Number",
    type: "text",
    required: true,
    placeholder: "e.g. APX-2026-881",
    halfWidth: true,
  },
  {
    name: "amount",
    label: "Invoice Taxable Amount (₹)",
    type: "number",
    required: true,
    placeholder: "e.g. 240000",
    halfWidth: true,
  },
  {
    name: "dueDate",
    label: "Statutory 45-Day Due Date",
    type: "date",
    halfWidth: true,
  },
  {
    name: "reasonForChange",
    label: "Statutory Bill Narration / Justification",
    type: "text",
    placeholder: "e.g. MSME Section 43B(h) raw material settlement booking",
  },
];

export function StatutoryComplianceView() {
  const [gstData, setGstData] = useState<GstSummaryResponse | null>(null);
  const [tdsData, setTdsData] = useState<TdsMsmeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingEInvoice, setIsGeneratingEInvoice] = useState<boolean>(false);
  const [isMsmeModalOpen, setIsMsmeModalOpen] = useState<boolean>(false);
  const [invoiceDocNo, setInvoiceDocNo] = useState<string>("");
  const [invoiceAmount, setInvoiceAmount] = useState<string>("");

  const loadStatutoryData = async () => {
    setIsLoading(true);
    try {
      const [gRes, tRes] = await Promise.all([
        tallyErpApi.fetchGstSummary(),
        tallyErpApi.fetchTdsMsmeSummary(),
      ]);
      setGstData(gRes);
      setTdsData(tRes);
    } catch (err: any) {
      toast({ title: "Failed to load Statutory Compliance", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatutoryData();
  }, []);

  const handleUpdateIms = async (reconciliationId: string, action: "ACCEPT" | "REJECT" | "PENDING") => {
    try {
      await tallyErpApi.updateImsAction(reconciliationId, action);
      toast({ title: "IMS Action Recorded", description: `Invoice state updated to ${action}.` });
      loadStatutoryData();
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerateEInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceDocNo.trim()) return;

    try {
      const res = await tallyErpApi.generateEInvoice({
        docNumber: invoiceDocNo,
        totalAmount: parseFloat(invoiceAmount) || 100000,
      });
      toast({ title: "e-Invoice Generated", description: `IRN: ${res.irn.substring(0, 16)}...` });
      setIsGeneratingEInvoice(false);
      setInvoiceDocNo("");
      loadStatutoryData();
    } catch (err: any) {
      toast({ title: "e-Invoice Generation Failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
        Loading GST Returns, e-Invoicing Registry & TDS Status...
      </div>
    );
  }

  const gstr1 = gstData?.gstr1;
  const gstr3b = gstData?.gstr3b;
  const reconciliations = gstData?.gstr2bReconciliations || [];
  const eInvoices = gstData?.eInvoices || [];
  const tdsSummary = tdsData?.tdsSummary || [];

  return (
    <div className="space-y-6">
      {/* Top Tax Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Outward Supplies (GSTR-1)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-foreground">
              ₹{(gstr1?.totalOutwardSupplies || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Taxable Sales Turnover</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Eligible ITC (GSTR-2B)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-emerald-600">
              ₹{(gstr3b?.table4_itc?.eligibleItcTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Auto-reconciled supplier credit</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Net Tax Payable (GSTR-3B)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-primary">
              ₹{(gstr3b?.taxOffset?.liabilities?.totalCashPayable || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Net Cash Liability after Offset</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Authenticated e-Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-indigo-600">{eInvoices.length}</div>
            <p className="text-xs text-muted-foreground mt-1">IRN registered with IRP</p>
          </CardContent>
        </Card>
      </div>

      {/* GSTR-3B Tax Offset Priority Algebra */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>GSTR-3B Statutory Tax Offset Priorities (Section 49A/49B)</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Priority Sequence: IGST Input Tax Credit is offset first against IGST, then CGST and SGST liabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border border-border bg-background">
              <span className="text-xs font-semibold text-muted-foreground">Central GST (CGST)</span>
              <div className="flex justify-between items-center mt-2 text-xs">
                <span>Gross Liability:</span>
                <span className="font-mono font-bold">₹{(gstr3b?.table31?.cgst || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-emerald-600">
                <span>ITC Offset:</span>
                <span className="font-mono font-bold">-₹{(gstr3b?.table4_itc?.itcCgst || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-border font-bold text-xs">
                <span>Net Payable:</span>
                <span className="font-mono text-primary">
                  ₹{(gstr3b?.taxOffset?.liabilities?.cgst || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-background">
              <span className="text-xs font-semibold text-muted-foreground">State GST (SGST)</span>
              <div className="flex justify-between items-center mt-2 text-xs">
                <span>Gross Liability:</span>
                <span className="font-mono font-bold">₹{(gstr3b?.table31?.sgst || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-emerald-600">
                <span>ITC Offset:</span>
                <span className="font-mono font-bold">-₹{(gstr3b?.table4_itc?.itcSgst || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-border font-bold text-xs">
                <span>Net Payable:</span>
                <span className="font-mono text-primary">
                  ₹{(gstr3b?.taxOffset?.liabilities?.sgst || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-background">
              <span className="text-xs font-semibold text-muted-foreground">Integrated GST (IGST)</span>
              <div className="flex justify-between items-center mt-2 text-xs">
                <span>Gross Liability:</span>
                <span className="font-mono font-bold">₹{(gstr3b?.table31?.igst || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-emerald-600">
                <span>ITC Offset:</span>
                <span className="font-mono font-bold">-₹{(gstr3b?.table4_itc?.itcIgst || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-border font-bold text-xs">
                <span>Net Payable:</span>
                <span className="font-mono text-primary">
                  ₹{(gstr3b?.taxOffset?.liabilities?.igst || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GSTR-2B & Invoice Management System (IMS) Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">GSTR-2B Inward Supply & IMS Actions</CardTitle>
            <CardDescription>
              Action Resolution: Accept to claim ITC in GSTR-3B, Reject to return to vendor, or Hold in pending queue.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reconciliations.length === 0 ? (
            <div className="p-6">
              <CorporateEmptyState
                icon={FileCheck}
                title="No Inward Invoices for Reconciliation"
                description="GSTR-2B inward vendor invoices will be loaded for dynamic reconciliation and IMS actions."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor GSTIN</TableHead>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Taxable Value</TableHead>
                  <TableHead>CGST / SGST</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">IMS Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-semibold">{r.vendorGstin}</TableCell>
                    <TableCell className="text-xs font-medium">{r.invoiceNumber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.invoiceDate}</TableCell>
                    <TableCell className="font-mono text-xs">₹{(r.taxableValue || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="font-mono text-xs">
                      ₹{(r.cgstAmount || 0).toLocaleString("en-IN")} / ₹{(r.sgstAmount || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.imsAction === "ACCEPT"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                            : r.imsAction === "REJECT"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                        }
                      >
                        {r.imsAction}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateIms(r.id, "ACCEPT")}
                          className="h-7 text-[10px] text-emerald-600 hover:bg-emerald-500/10 gap-1 px-2"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateIms(r.id, "REJECT")}
                          className="h-7 text-[10px] text-rose-600 hover:bg-rose-500/10 gap-1 px-2"
                        >
                          <XCircle className="h-3 w-3" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateIms(r.id, "PENDING")}
                          className="h-7 text-[10px] text-amber-600 hover:bg-amber-500/10 gap-1 px-2"
                        >
                          <Clock className="h-3 w-3" /> Hold
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Authenticated e-Invoices Register */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">e-Invoicing Registry & IRN Numbers</CardTitle>
            <CardDescription>
              Government Invoice Registration Portal (IRP) authenticated sales invoices with standard 64-char SHA-256 IRN.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsGeneratingEInvoice(true)} className="gap-1 text-xs">
            <QrCode className="h-3.5 w-3.5" /> Generate e-Invoice IRN
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {eInvoices.length === 0 ? (
            <div className="p-6">
              <CorporateEmptyState
                icon={QrCode}
                title="No e-Invoices Generated Yet"
                description="Click 'Generate e-Invoice IRN' to register sales invoices with the government portal."
                actionLabel="Generate e-Invoice"
                onAction={() => setIsGeneratingEInvoice(true)}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount (₹)</TableHead>
                  <TableHead>64-Character SHA-256 IRN</TableHead>
                  <TableHead>Ack Number</TableHead>
                  <TableHead>e-Way Bill</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eInvoices.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs font-semibold">{e.voucherNumber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.voucherDate}</TableCell>
                    <TableCell className="font-mono text-xs font-bold">
                      ₹{(e.totalAmount || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[200px] truncate" title={e.irn}>
                      {e.irn}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.ackNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{e.ewayBillNumber || "—"}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                        {e.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* TDS Deductions & MSME Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">TDS Deductions & Section Limits</CardTitle>
            <CardDescription>Budget 2026 Section 194C, 194J, 194Q & Section 43B(h) MSME compliance</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-semibold gap-1.5"
            onClick={() => setIsMsmeModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Record MSME Bill
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Statutory Threshold</TableHead>
                <TableHead>Utilized Payouts</TableHead>
                <TableHead>TDS Deducted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tdsSummary.map((t) => (
                <TableRow key={t.sectionCode}>
                  <TableCell className="font-mono text-xs font-bold text-primary">{t.sectionCode}</TableCell>
                  <TableCell className="text-xs font-medium">{t.sectionDescription || (t as any).sectionTitle || t.sectionCode}</TableCell>
                  <TableCell className="font-mono text-xs">₹{(t.thresholdLimit || 0).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold">
                    ₹{(t.utilizedAmount || (t as any).cumulativeTdsDeducted || 0).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-emerald-600">
                    ₹{(t.tdsDeductedAmount || (t as any).cumulativeTdsDeducted || 0).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        t.complianceStatus === "WITHIN_LIMITS" || (t as any).status === "COMPLIANT_ON_SCHEDULE" || (t as any).status === "ZERO_PENDING_CHALLAN"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                      }
                    >
                      {t.complianceStatus || (t as any).status || "COMPLIANT"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generate E-Invoice Dialog */}
      <Dialog open={isGeneratingEInvoice} onOpenChange={setIsGeneratingEInvoice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Standard e-Invoice IRN</DialogTitle>
            <DialogDescription>
              Dispatches TLS 1.3 request to the government Invoice Registration Portal (IRP).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerateEInvoice} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Invoice Document Number</label>
              <Input
                value={invoiceDocNo}
                onChange={(e) => setInvoiceDocNo(e.target.value)}
                placeholder="e.g. INV-2026-901"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Total Taxable Invoice Amount (₹)</label>
              <Input
                type="number"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <Button type="submit" className="w-full font-bold">
              Dispatch to IRP & Generate IRN
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <RecordFormModal
        isOpen={isMsmeModalOpen}
        onClose={() => setIsMsmeModalOpen(false)}
        onSaved={loadStatutoryData}
        title="Record MSME Supplier Bill / Section 43B(h)"
        endpoint="/api/v1/finance/tally/statutory/tds-msme"
        fields={MSME_FIELDS}
        submitLabel="Register MSME Bill"
        contextNote="Registers vendor invoice under 45-day statutory MSME payment rule in Tally general ledger."
      />
    </div>
  );
}
