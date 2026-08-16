"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { RecordFormModal, RecordField } from "@/components/core/RecordFormModal";
import { ShieldAlert, TrendingUp, Heart, AlertCircle, Loader2, RefreshCw, Plus } from "lucide-react";
import { aiIntelligenceApi, RiskMarketInsight } from "@/services/aiIntelligenceApi";

const RISK_MARKET_FIELDS: RecordField[] = [
  {
    name: "commodityName",
    label: "Commodity / Market Category",
    type: "text",
    required: true,
    placeholder: "e.g. Structural Steel Fe-550D / RMC M25",
  },
  {
    name: "currentMarketIndexPrice",
    label: "Current Market Index Price (₹ / Ton)",
    type: "number",
    required: true,
    placeholder: "e.g. 58500",
    halfWidth: true,
  },
  {
    name: "priceTrendRecommendation",
    label: "Strategic Recommendation",
    type: "select",
    required: true,
    options: [
      { value: "STRATEGIC_BUY", label: "STRATEGIC BUY" },
      { value: "HOLD", label: "HOLD" },
      { value: "MONITOR", label: "MONITOR" },
    ],
    halfWidth: true,
  },
  {
    name: "fraudAnomalyScore",
    label: "Fraud / Variance Anomaly Score (0-100)",
    type: "number",
    placeholder: "e.g. 15",
    halfWidth: true,
  },
  {
    name: "customerSentimentScore",
    label: "Customer Sentiment Index (0-100)",
    type: "number",
    placeholder: "e.g. 82",
    halfWidth: true,
  },
  {
    name: "summary",
    label: "Strategic Intelligence Summary",
    type: "textarea",
    required: true,
    placeholder: "e.g. Global supply shortage indicated for secondary steel billets; locking Q3 inventory rates advised.",
  },
];

export function RiskMarketIntelligenceView() {
  const [risk, setRisk] = useState<RiskMarketInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await aiIntelligenceApi.getRiskMarket();
      setRisk(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Risk market insights could not be loaded");
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
        <span>Evaluating commodity market indices (steel/cement) and buyer sentiment scores...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Risk & Market AI Engine Unreachable"
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
            Fraud Risk Monitor, Commodity Advisor & Customer Sentiment Barometer
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-department anomaly detection, commodity rate trends, and residential buyer satisfaction metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Log Market Signal
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={loadData}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Feed
          </Button>
        </div>
      </div>

      {risk.length === 0 ? (
        <CorporateEmptyState
          title="No Active Risk Signals or Commodity Alerts"
          description="Commodity indices are stable and inventory gate logs show zero fraud anomalies across site accounts."
          actionLabel="Log Market Signal"
          onAction={() => setIsCreateModalOpen(true)}
          icon={TrendingUp}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Commodity / Material Category</TableHead>
                <TableHead className="text-xs font-semibold text-right">Current Index Price</TableHead>
                <TableHead className="text-xs font-semibold text-center">AI Recommendation</TableHead>
                <TableHead className="text-xs font-semibold text-center">Fraud Anomaly Score</TableHead>
                <TableHead className="text-xs font-semibold text-center">Customer Sentiment</TableHead>
                <TableHead className="text-xs font-semibold">Signal Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risk.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {item.commodityName}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency(item.currentMarketIndexPrice)} / Ton
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    {item.priceTrendRecommendation === "STRATEGIC_BUY" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                        STRATEGIC BUY
                      </Badge>
                    ) : item.priceTrendRecommendation === "HOLD" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                        HOLD
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-medium border-border">
                        MONITOR
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold">
                    {item.fraudAnomalyScore > 50 ? (
                      <span className="text-red-800 flex items-center justify-center gap-1">
                        <ShieldAlert className="h-3 w-3 text-red-700" />
                        {item.fraudAnomalyScore} / 100 (HIGH RISK)
                      </span>
                    ) : (
                      <span className="text-emerald-800">{item.fraudAnomalyScore} / 100 (LOW RISK)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <Heart className="h-3 w-3 text-rose-700" />
                      <span>{item.customerSentimentScore} / 100</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground max-w-xs truncate">
                    {item.summary}
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
        title="Record Market Intelligence / Pricing Signal"
        endpoint="/api/v1/ai-intelligence/risk-market"
        fields={RISK_MARKET_FIELDS}
        submitLabel="Submit Market Signal"
        contextNote="Ingests real-time commodity data into the executive risk dashboard."
      />
    </div>
  );
}
