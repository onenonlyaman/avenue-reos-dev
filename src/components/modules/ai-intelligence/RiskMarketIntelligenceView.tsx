"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ShieldAlert, TrendingUp, Heart, AlertCircle, Loader2 } from "lucide-react";
import { aiIntelligenceApi, RiskMarketInsight } from "@/services/aiIntelligenceApi";

export function RiskMarketIntelligenceView() {
  const [risk, setRisk] = useState<RiskMarketInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        </div>
      </div>

      {risk.length === 0 ? (
        <CorporateEmptyState
          title="No Active Risk Signals or Commodity Alerts"
          description="Commodity indices are stable and inventory gate logs show zero fraud anomalies across Nashik site accounts."
          actionLabel="Refresh Market Feed"
          onAction={loadData}
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
                  <TableCell className="text-xs py-3 text-muted-foreground font-medium">
                    {item.summary}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
