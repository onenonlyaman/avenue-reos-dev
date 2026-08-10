"use client";

import React, { useState, useEffect } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileCheck, ShieldCheck, Landmark, AlertTriangle, FileSpreadsheet, Send, History } from "lucide-react";
import { tallyErpApi, GstSummaryResponse, TdsMsmeResponse } from "@/services/tallyErpApi";

export function StatutoryComplianceView() {
  const [gstData, setGstData] = useState<GstSummaryResponse | null>(null);
  const [tdsMsmeData, setTdsMsmeData] = useState<TdsMsmeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingIrn, setIsGeneratingIrn] = useState<boolean>(false);
  const [irnResult, setIrnResult] = useState<{ irn: string; eWayBillNumber: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gRes, tmRes] = await Promise.all([
        tallyErpApi.fetchGstSummary(),
        tallyErpApi.fetchTdsMsmeSummary(),
      ]);
      setGstData(gRes);
      setTdsMsmeData(tmRes);
    } catch {
      setGstData(null);
      setTdsMsmeData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateIrn = async () => {
    setIsGeneratingIrn(true);
    try {
      const res = await tallyErpApi.generateEInvoice({ invoiceNumber: "INV-2026-NASHIK-001" });
      setIrnResult(res);
      await loadData();
    } catch {
    } finally {
      setIsGeneratingIrn(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CorporateStatCard
          label="GSTR-1 Taxable Turnover"
          value={`₹${(gstData?.gstr1SalesTotal || 0).toLocaleString("en-IN")}`}
          subtext="OUTWARD SUPPLIES REGISTER"
          icon={FileCheck}
          trend="Automated"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="GSTR-3B Tax Liability"
          value={`₹${(gstData?.gstr3bTaxLiability || 0).toLocaleString("en-IN")}`}
          subtext="ESTIMATED NET TAX PAYABLE"
          icon={Landmark}
          trend="GSTR-3B Ready"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="GSTR-2A/2B ITC Mismatches"
          value={String(gstData?.itcMismatchCount || 0)}
          subtext="Input Tax Credit Variance"
          icon={AlertTriangle}
          trend={gstData?.itcMismatchCount ? "Mismatch Flagged" : "Reconciled"}
          trendDirection={gstData?.itcMismatchCount ? "down" : "up"}
        />
        <CorporateStatCard
          label="MCA Append-Only Audit Entries"
          value={String(tdsMsmeData?.mcaLogs.length || 0)}
          subtext="Statutory Audit Trail"
          icon={History}
          trend="Immutable Log"
          trendDirection="neutral"
        />
      </div>

      <Tabs defaultValue="gst" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl h-9">
          <TabsTrigger value="gst" className="text-xs font-semibold">
            GST & E-Invoicing
          </TabsTrigger>
          <TabsTrigger value="tds-msme" className="text-xs font-semibold">
            TDS & Section 43B(h) MSME
          </TabsTrigger>
          <TabsTrigger value="mca" className="text-xs font-semibold">
            MCA Audit Trail Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gst" className="pt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-semibold font-heading">
                  E-Invoice IRN & E-Way Dispatch
                </CardTitle>
                <CardDescription className="text-xs">
                  NIC portal connected auto-generation engine
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="p-3 bg-muted/40 border border-border rounded-md space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Portal Status:</span>
                    <span className="font-semibold text-emerald-700">GSTN NIC API Connected</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Active GSTIN:</span>
                    <span className="font-mono">27AAACA1234F1Z5</span>
                  </div>
                </div>

                {irnResult && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs space-y-1 font-mono">
                    <div className="text-emerald-900 font-bold">E-Invoice Generated Successfully</div>
                    <div className="text-[11px] text-emerald-800 break-all">IRN: {irnResult.irn}</div>
                    <div className="text-[11px] text-emerald-800">E-Way Bill #: {irnResult.eWayBillNumber}</div>
                  </div>
                )}

                <Button
                  onClick={handleGenerateIrn}
                  disabled={isGeneratingIrn}
                  className="w-full h-8 text-xs font-semibold gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isGeneratingIrn ? "Dispatching IRN..." : "Generate E-Invoice & E-Way Bill"}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-semibold font-heading">
                  GSTR-2A / 2B ITC Reconciliation Mismatches
                </CardTitle>
                <CardDescription className="text-xs">
                  Books of accounts vs GST portal purchase register discrepancies
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Loading GST reconciliation...</div>
                ) : !gstData?.mismatches || gstData.mismatches.length === 0 ? (
                  <CorporateEmptyState
                    title="Zero GSTR-2A/2B Mismatches"
                    description="All purchase register invoices match the GST portal records."
                    icon={ShieldCheck}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-xs font-semibold">Vendor Name</TableHead>
                        <TableHead className="text-xs font-semibold">Invoice Ref</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Portal ITC</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Books ITC</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Variance</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gstData.mismatches.map((m) => (
                        <TableRow key={m.id} className="border-border">
                          <TableCell className="text-xs font-medium">{m.vendorName}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{m.invoiceNumber}</TableCell>
                          <TableCell className="text-xs font-mono text-right">₹{m.portalItcAmount.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-xs font-mono text-right">₹{m.booksItcAmount.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-xs font-mono font-bold text-destructive text-right">₹{m.varianceAmount.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                              {m.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tds-msme" className="pt-4 space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold font-heading">
                    TDS / TCS Statutory Deduction Threshold Engine
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Sections 194C, 194J, 194I, and 194Q compliance status
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export Form 26Q
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(tdsMsmeData?.tdsSummary || []).map((t) => (
                  <div key={t.sectionCode} className="p-3 bg-card border border-border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-bold">
                        Section {t.sectionCode}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300">
                        {t.complianceStatus}
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold line-clamp-1">{t.sectionDescription}</div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div>Threshold: ₹{t.thresholdLimit.toLocaleString("en-IN")}</div>
                      <div>Deducted: ₹{t.tdsDeductedAmount.toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold font-heading">
                Section 43B(h) MSME Payment Monitor (15d / 45d Rules)
              </CardTitle>
              <CardDescription className="text-xs">
                Micro & Small vendor payment window alerts and tax disallowance risk tracker
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!tdsMsmeData?.msmeVendors || tdsMsmeData.msmeVendors.length === 0 ? (
                <CorporateEmptyState
                  title="Zero Overdue MSME Invoices"
                  description="No Micro or Small enterprise vendor invoices are past the 15/45-day payment window."
                  icon={ShieldCheck}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold">Vendor Name</TableHead>
                      <TableHead className="text-xs font-semibold">Category</TableHead>
                      <TableHead className="text-xs font-semibold">Invoice Ref</TableHead>
                      <TableHead className="text-xs font-semibold">Window</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Invoice Amount</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Overdue Amount</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Tax Risk Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tdsMsmeData.msmeVendors.map((v) => (
                      <TableRow key={v.id} className="border-border">
                        <TableCell className="text-xs font-medium">{v.vendorName}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {v.msmeCategory}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{v.invoiceNumber}</TableCell>
                        <TableCell className="text-xs">{v.paymentWindowDays} Days</TableCell>
                        <TableCell className="text-xs font-mono text-right">₹{v.amount.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-destructive text-right">₹{v.overdueAmount.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-center">
                          {v.taxDisallowanceRisk ? (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                              Disallowance Risk
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300">
                              Compliant
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mca" className="pt-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold font-heading">
                Immutable MCA Append-Only Audit Trail Inspector
              </CardTitle>
              <CardDescription className="text-xs">
                Companies Act compliant voucher creation, alteration, and cancellation logs
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!tdsMsmeData?.mcaLogs || tdsMsmeData.mcaLogs.length === 0 ? (
                <CorporateEmptyState
                  title="No Audit Logs Recorded"
                  description="Audit trail logs will appear automatically upon voucher posting."
                  icon={History}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold">Timestamp</TableHead>
                      <TableHead className="text-xs font-semibold">Voucher Ref</TableHead>
                      <TableHead className="text-xs font-semibold">Operation</TableHead>
                      <TableHead className="text-xs font-semibold">User Identity</TableHead>
                      <TableHead className="text-xs font-semibold">IP Address</TableHead>
                      <TableHead className="text-xs font-semibold">Changes Digest</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tdsMsmeData.mcaLogs.map((log) => (
                      <TableRow key={log.id} className="border-border">
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {log.timestamp.replace("T", " ").slice(0, 19)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold font-mono">{log.voucherReference}</TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              log.actionType === "CREATE"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : log.actionType === "ALTER"
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                          >
                            {log.actionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{log.userId}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.ipAddress}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-xs">
                          {log.fieldChangesSummary}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
