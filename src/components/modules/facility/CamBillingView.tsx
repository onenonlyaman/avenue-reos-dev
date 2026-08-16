"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Receipt, RefreshCw, AlertCircle, Loader2, Plus, Building2, CheckCircle2, Clock } from "lucide-react";
import { facilityApi, CamInvoice } from "@/services/facilityApi";

export function CamBillingView() {
  const [invoices, setInvoices] = useState<CamInvoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q3");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [camRate, setCamRate] = useState<number | "">(3.5);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await facilityApi.getCamInvoices();
      setInvoices(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "CAM invoices could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateInvoices = async () => {
    try {
      setIsGenerating(true);
      setGenerateError(null);

      const period = `${selectedQuarter} ${selectedYear}`;
      const rate = typeof camRate === "number" && camRate > 0 ? camRate : 3.5;

      await facilityApi.generateCamInvoices({
        billingPeriod: period,
        ratePerSqft: rate,
      });

      setIsGenerateModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : "CAM invoices could not be generated");
    } finally {
      setIsGenerating(false);
    }
  };

  const totalBilled = invoices.reduce((sum, i) => sum + i.totalDueAmount, 0);
  const totalPaid = invoices.filter((i) => i.paymentStatus === "PAID").reduce((sum, i) => sum + i.totalDueAmount, 0);
  const totalUnpaid = invoices.filter((i) => i.paymentStatus === "UNPAID" || i.paymentStatus === "OVERDUE").reduce((sum, i) => sum + i.totalDueAmount, 0);
  const billedUnitsCount = invoices.length;

  const filteredInvoices = statusFilter === "ALL"
    ? invoices
    : invoices.filter((i) => i.paymentStatus === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Common Area Maintenance (CAM) Ledger & Collections
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quarterly maintenance billing and dues ledger across all development units
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 font-medium shrink-0"
            onClick={() => {
              setGenerateError(null);
              setIsGenerateModalOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Generate Quarterly CAM Run
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 font-medium"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Total Billed Maintenance"
          value={`₹${totalBilled.toLocaleString("en-IN")}`}
          subtext={`${billedUnitsCount} Unit Invoices Generated`}
          icon={Receipt}
          trend="Ledger Invoiced"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Collected Maintenance"
          value={`₹${totalPaid.toLocaleString("en-IN")}`}
          subtext="Settled Bank Collections"
          icon={CheckCircle2}
          trend="Realized"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Outstanding CAM Dues"
          value={`₹${totalUnpaid.toLocaleString("en-IN")}`}
          subtext="Pending & Overdue Receivables"
          icon={Clock}
          trend={totalUnpaid > 0 ? "Pending Collection" : "All Clear"}
          trendDirection={totalUnpaid > 0 ? "down" : "up"}
        />

        <CorporateStatCard
          label="Active Invoiced Units"
          value={`${billedUnitsCount} Units`}
          subtext="Covered under CAM register"
          icon={Building2}
          trend="Active Matrix"
          trendDirection="neutral"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading maintenance ledger invoices...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="CAM Billing Ledger Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : invoices.length === 0 ? (
        <CorporateEmptyState
          title="No CAM Invoices Recorded"
          description="There are currently no maintenance billing invoices generated in the facility ledger."
          actionLabel="Generate Quarterly CAM Run"
          onAction={() => setIsGenerateModalOpen(true)}
          icon={Receipt}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Invoice Ledger ({filteredInvoices.length} entries)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filter:</span>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                <SelectTrigger className="h-7 text-xs w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Invoice Reference</TableHead>
                  <TableHead className="text-xs font-semibold">Property Development Unit</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Super Built-up Area</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Billing Period</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Base CAM (₹)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">GST 18% (₹)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Total Due (₹)</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((i) => {
                  let badgeStyle = "bg-slate-100 text-slate-800 border-slate-300";
                  let statusText = "Unpaid";

                  if (i.paymentStatus === "PAID") {
                    badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                    statusText = "Paid";
                  } else if (i.paymentStatus === "UNPAID") {
                    badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                    statusText = "Unpaid";
                  } else if (i.paymentStatus === "OVERDUE") {
                    badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                    statusText = "Overdue";
                  }

                  return (
                    <TableRow key={i.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                        {i.invoiceReference}
                      </TableCell>
                      <TableCell className="text-xs py-3 font-medium text-foreground">
                        {i.unitName}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono text-muted-foreground">
                        {i.superBuiltupSqft} Sq. Ft.
                      </TableCell>
                      <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                        {i.billingPeriod}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                        ₹{i.baseCamAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono text-emerald-800">
                        ₹{i.gstAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono font-bold text-primary text-sm">
                        ₹{i.totalDueAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-center">
                        <Badge variant="outline" className={`text-[10px] font-bold ${badgeStyle}`}>
                          {statusText}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="sm:max-w-md w-full p-6 bg-card text-card-foreground">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold font-heading flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Generate Quarterly CAM Invoices
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Calculate and generate quarterly maintenance bills for all registered development units.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {generateError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
                {generateError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Billing Quarter</Label>
                <Select value={selectedQuarter} onValueChange={(val) => val && setSelectedQuarter(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1 (Apr - Jun)</SelectItem>
                    <SelectItem value="Q2">Q2 (Jul - Sep)</SelectItem>
                    <SelectItem value="Q3">Q3 (Oct - Dec)</SelectItem>
                    <SelectItem value="Q4">Q4 (Jan - Mar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fiscal Year</Label>
                <Select value={selectedYear} onValueChange={(val) => val && setSelectedYear(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Base CAM Rate (₹ per Sq. Ft.)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={camRate}
                onChange={(e) => setCamRate(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
                placeholder="e.g. 3.5"
              />
              <span className="text-[10px] text-muted-foreground">
                Applicable to super built-up area. 18% statutory GST will be calculated automatically.
              </span>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setIsGenerateModalOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={handleGenerateInvoices}
              disabled={isGenerating || !camRate}
            >
              {isGenerating ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating Invoices...
                </span>
              ) : (
                "Generate Invoices"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
