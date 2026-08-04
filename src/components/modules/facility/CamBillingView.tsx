"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Receipt, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { facilityApi, CamInvoice } from "@/services/facilityApi";

export function CamBillingView() {
  const [invoices, setInvoices] = useState<CamInvoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

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
      setError(null);
      await facilityApi.generateCamInvoices({
        billingPeriod: "Q3 2026",
        ratePerSqft: 3.5,
      });
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "CAM invoices could not be saved");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Common Area Maintenance (CAM) Ledger & Collections
          </h3>
        </div>

        <Button
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium shrink-0"
          onClick={handleGenerateInvoices}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Generate Quarterly CAM Invoices
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading maintenance invoices...</span>
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
          actionLabel="Generate Quarterly CAM Invoices"
          onAction={handleGenerateInvoices}
          icon={Receipt}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
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
              {invoices.map((i) => {
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
      )}
    </div>
  );
}
