"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { DollarSign, AlertCircle, Loader2 } from "lucide-react";
import { analyticsApi, ProjectIrr } from "@/services/analyticsApi";

export function ProjectIrrView() {
  const [irrRecords, setIrrRecords] = useState<ProjectIrr[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await analyticsApi.getIrrRecords();
      setIrrRecords(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Project IRR records could not be loaded");
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
            Project IRR & Profit Margin Audit Register
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Internal rate of return benchmarks, equity deployment, and unit collection performance.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading return metrics...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Project IRR Register Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : irrRecords.length === 0 ? (
        <CorporateEmptyState
          title="No Project IRR Metrics Found"
          description="No project return profiles on record."
          icon={DollarSign}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Development Project</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Invested Equity (₹ Cr)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Realized Collections (₹ Cr)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Projected Net Margin (%)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Internal Rate of Return (IRR %)</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Performance Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {irrRecords.map((r) => {
                  let badgeStyle = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
                  if (r.performanceBadge === "ON_TARGET") {
                    badgeStyle = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
                  } else if (r.performanceBadge === "UNDERPERFORMING") {
                    badgeStyle = "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
                  }

                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs py-3 font-semibold text-foreground">
                        {r.projectName}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono text-muted-foreground">
                        ₹{r.investedEquityCr.toFixed(2)} Cr
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        ₹{r.realizedCollectionsCr.toFixed(2)} Cr
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                        {r.projectedNetMarginPct}%
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-mono font-extrabold text-primary text-sm">
                        {r.internalRateOfReturnPct}% IRR
                      </TableCell>
                      <TableCell className="text-xs py-3 text-center">
                        <Badge variant="outline" className={`text-[10px] font-mono font-bold ${badgeStyle}`}>
                          {r.performanceBadge}
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
    </div>
  );
}
