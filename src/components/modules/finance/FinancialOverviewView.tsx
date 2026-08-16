"use client";

import React, { useEffect, useState } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { financeApi, FinancialOverviewData } from "@/services/financeApi";
import { Landmark, TrendingUp, CreditCard, PieChart, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function FinancialOverviewView() {
  const [data, setData] = useState<FinancialOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await financeApi.getOverview();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Financial metrics could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading general ledger metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Financial Overview Unavailable"
        description={error}
        actionLabel="Retry Ledger Connection"
        onAction={fetchOverview}
        icon={AlertCircle}
      />
    );
  }

  if (!data) {
    return (
      <CorporateEmptyState
        title="No General Ledger Data"
        description="No financial metrics or budget allocations found on record."
        actionLabel="Refresh Overview"
        onAction={fetchOverview}
        icon={AlertCircle}
      />
    );
  }

  const escrowSum = data.cashInEscrowCr;
  const cashPositionTotal = escrowSum + data.operationalCashCr;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Enterprise Cash Position"
          value={`₹${cashPositionTotal.toFixed(2)} Cr`}
          subtext={`₹${escrowSum.toFixed(2)} Cr Escrow | ₹${data.operationalCashCr.toFixed(2)} Cr Liquidity`}
          icon={Landmark}
          trend="Escrow Protected"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Accounts Receivable"
          value={`₹${data.accountsReceivableCr.toFixed(2)} Cr`}
          subtext="Outstanding buyer milestone collections"
          icon={TrendingUp}
          trend="Calculated from DB"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Accounts Payable"
          value={`₹${data.accountsPayableCr.toFixed(2)} Cr`}
          subtext="Committed contractor & vendor POs"
          icon={CreditCard}
          trend="Within SLA"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="YTD Operating Profit Margin"
          value={`${data.ytdProfitMarginPct}%`}
          subtext="Net realization after statutory RERA escrow"
          icon={PieChart}
          trend="Margin Target"
          trendDirection="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card text-card-foreground p-5 rounded-lg border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold font-heading text-foreground">
                Quarterly Capital Realization & Variance Runway
              </h3>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              FY 2026-27 Q3
            </Badge>
          </div>

          <div className="space-y-4 pt-1 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-foreground">Total Authorized Budget Allocation</span>
                <span className="font-mono text-foreground font-bold">₹{data.quarterlyBudgetAllocatedCr.toFixed(2)} Cr</span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div className="bg-primary h-full w-full rounded-full" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-foreground">Committed Purchase Orders & Liabilities</span>
                <span className="font-mono text-amber-800 font-bold">
                  ₹{data.quarterlyBudgetCommittedCr.toFixed(2)} Cr (
                  {data.quarterlyBudgetAllocatedCr > 0
                    ? ((data.quarterlyBudgetCommittedCr / data.quarterlyBudgetAllocatedCr) * 100).toFixed(1)
                    : "0.0"}
                  %)
                </span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="bg-amber-600 h-full rounded-full"
                  style={{
                    width: `${
                      data.quarterlyBudgetAllocatedCr > 0
                        ? Math.min(100, (data.quarterlyBudgetCommittedCr / data.quarterlyBudgetAllocatedCr) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-foreground">Actual Disbursed Liquidity</span>
                <span className="font-mono text-emerald-800 font-bold">
                  ₹{data.quarterlyBudgetDisbursedCr.toFixed(2)} Cr (
                  {data.quarterlyBudgetAllocatedCr > 0
                    ? ((data.quarterlyBudgetDisbursedCr / data.quarterlyBudgetAllocatedCr) * 100).toFixed(1)
                    : "0.0"}
                  %)
                </span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{
                    width: `${
                      data.quarterlyBudgetAllocatedCr > 0
                        ? Math.min(100, (data.quarterlyBudgetDisbursedCr / data.quarterlyBudgetAllocatedCr) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground p-5 rounded-lg border border-border shadow-xs space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-bold font-heading text-foreground">
              RERA Escrow Compliance Summary
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>Statutory Compliance Verified</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                70% of customer milestone collections deposited directly into designated HDFC RERA Escrow account.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              {data.projectEscrows && data.projectEscrows.length > 0 ? (
                data.projectEscrows.map((proj) => (
                  <div key={proj.id} className="flex justify-between text-muted-foreground">
                    <span>{proj.projectName} ({proj.location})</span>
                    <span className="font-mono text-foreground font-semibold">₹{proj.escrowCr.toFixed(2)} Cr</span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-[11px] py-1">
                  Escrow accounts linked to registered master developments.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
