"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { RecordFormModal, RecordField } from "@/components/core/RecordFormModal";
import { ShoppingBag, RefreshCw, AlertCircle, Loader2, Plus } from "lucide-react";
import { aiIntelligenceApi, FinanceProcurementInsight } from "@/services/aiIntelligenceApi";

const FINANCE_PROCUREMENT_FIELDS: RecordField[] = [
  {
    name: "itemName",
    label: "Material / Requisition Item Description",
    type: "text",
    required: true,
    placeholder: "e.g. Fe-550D TMT Reinforcement Steel 16mm",
  },
  {
    name: "suggestedVendorName",
    label: "AI / Preferred Vendor Name",
    type: "text",
    required: true,
    placeholder: "e.g. Jindal Steel & Power Ltd",
  },
  {
    name: "historicalQuoteAmount",
    label: "Historical / Market Quote Amount (₹)",
    type: "number",
    required: true,
    placeholder: "e.g. 5200000",
    halfWidth: true,
  },
  {
    name: "recommendedAllocationAmount",
    label: "Recommended Optimized Allocation (₹)",
    type: "number",
    required: true,
    placeholder: "e.g. 4850000",
    halfWidth: true,
  },
  {
    name: "cashBurnTrajectory",
    label: "Cash Burn Trajectory",
    type: "select",
    required: true,
    options: [
      { value: "OPTIMIZED", label: "OPTIMIZED" },
      { value: "STABLE", label: "STABLE" },
      { value: "HIGH_BURN", label: "HIGH BURN" },
    ],
  },
];

export function FinanceProcurementAiView() {
  const [insights, setInsights] = useState<FinanceProcurementInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await aiIntelligenceApi.getFinanceProcurement();
      setInsights(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Finance procurement insights could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Evaluating cash burn trajectories and matching optimal vendor allocations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Finance AI Service Error"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Automated Procurement Matcher & Cash Burn Trajectory Forecaster
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Predictive supplier rate benchmarks, bill-of-materials optimization, and liquidity burn forecast.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Log Procurement Anomaly
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={loadData}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Recommendations
          </Button>
        </div>
      </div>

      {insights.length === 0 ? (
        <CorporateEmptyState
          title="No Financial or Procurement Recommendations"
          description="Material allocation matcher has no pending optimization suggestions. Open purchase requisitions will automatically trigger allocation recommendations."
          actionLabel="Log Procurement Anomaly"
          onAction={() => setIsCreateModalOpen(true)}
          icon={ShoppingBag}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Material Requisition Item</TableHead>
                <TableHead className="text-xs font-semibold">AI Suggested Vendor</TableHead>
                <TableHead className="text-xs font-semibold text-right">Historical Quote</TableHead>
                <TableHead className="text-xs font-semibold text-right">Recommended Allocation</TableHead>
                <TableHead className="text-xs font-semibold text-center">Cost Savings %</TableHead>
                <TableHead className="text-xs font-semibold text-center">Cash Burn Trajectory</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insights.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {item.itemName}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {item.suggestedVendorName}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono text-muted-foreground">
                    {formatCurrency(item.historicalQuoteAmount)}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency(item.recommendedAllocationAmount)}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold text-emerald-800">
                    +{item.savingsPercentage}% Saved
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    {item.cashBurnTrajectory === "OPTIMIZED" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                        OPTIMIZED
                      </Badge>
                    ) : item.cashBurnTrajectory === "HIGH_BURN" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                        HIGH BURN
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-medium border-border">
                        STABLE
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RecordFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={loadData}
        title="Log Material Procurement Anomaly / Benchmark"
        endpoint="/api/v1/ai-intelligence/finance-procurement"
        fields={FINANCE_PROCUREMENT_FIELDS}
        submitLabel="Record Benchmark Anomaly"
        contextNote="Stores vendor optimization pricing into the organizational intelligence model."
      />
    </div>
  );
}
