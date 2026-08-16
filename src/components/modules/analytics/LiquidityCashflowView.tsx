"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { LineChart, Plus, AlertCircle, Loader2 } from "lucide-react";
import { analyticsApi, LiquidityEntry } from "@/services/analyticsApi";
import { SimulateCashflowModal } from "./SimulateCashflowModal";

export function LiquidityCashflowView() {
  const [entries, setEntries] = useState<LiquidityEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await analyticsApi.getLiquidity();
      setEntries(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Liquidity entries could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Liquidity Forecast & Debt Service Coverage Ratio (DSCR)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quarterly cash flow realizations, contractor disbursements, and debt solvency index.
          </p>
        </div>

        <Button
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium shrink-0"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Simulate Cash Flow Projections
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading cash flow forecasts...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Liquidity Forecast Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : entries.length === 0 ? (
        <CorporateEmptyState
          title="No Cash Flow Forecasts Recorded"
          description="No cash flow entries or solvency simulations on record."
          actionLabel="Simulate Cash Flow Projections"
          onAction={() => setIsModalOpen(true)}
          icon={LineChart}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Operating Period</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Customer Inflows (₹ L)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Vendor Outflows (₹ L)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Debt Service (₹ L)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Net Operating Cash Flow (₹ L)</TableHead>
                  <TableHead className="text-xs font-semibold text-center">DSCR Ratio</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Solvency Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  let badgeStyle = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
                  if (e.solvencyStatus === "Debt Caution") {
                    badgeStyle = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
                  } else if (e.solvencyStatus === "Liquidity Risk") {
                    badgeStyle = "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
                  }

                  return (
                    <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs py-3 font-semibold text-foreground">
                        {e.operatingPeriod}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        ₹{e.customerInflowsLakhs.toLocaleString("en-IN")} L
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono font-bold text-rose-700 dark:text-rose-400">
                        ₹{e.vendorOutflowsLakhs.toLocaleString("en-IN")} L
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                        {e.debtServiceLakhs > 0 ? `₹${e.debtServiceLakhs.toLocaleString("en-IN")} L` : "₹0 L (Debt Free)"}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono font-bold text-primary text-sm">
                        ₹{e.netOperatingCashflowLakhs.toLocaleString("en-IN")} L
                      </TableCell>
                      <TableCell className="text-xs py-3 text-center font-mono font-extrabold text-foreground">
                        {e.debtServiceLakhs > 0 ? `${e.dscrRatio}x` : "Unleveraged"}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-center">
                        <Badge variant="outline" className={`text-[10px] font-bold ${badgeStyle}`}>
                          {e.solvencyStatus}
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

      <SimulateCashflowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSimulationCreated={loadData}
      />
    </div>
  );
}
