"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { TrendingUp, PieChart, Building2, Layers, AlertCircle, Loader2 } from "lucide-react";
import { analyticsApi, PortfolioValuation } from "@/services/analyticsApi";

export function PortfolioValuationView() {
  const [valuations, setValuations] = useState<PortfolioValuation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await analyticsApi.getValuations();
      setValuations(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Portfolio valuations could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalGdvCr = valuations.reduce((sum, v) => sum + v.grossDevelopmentValueCr, 0);
  const totalNavCr = valuations.reduce((sum, v) => sum + v.netAssetValueCr, 0);
  const totalAreaSqft = valuations.reduce((sum, v) => sum + v.totalSaleableAreaSqft, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Portfolio Gross Development Value (GDV) & NAV
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Gross Development Value (GDV)"
          value={`₹${totalGdvCr.toFixed(2)} Cr`}
          subtext="Total projected development valuation"
          icon={TrendingUp}
          trend="Portfolio GDV"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Consolidated Net Asset Value"
          value={`₹${totalNavCr.toFixed(2)} Cr`}
          subtext="Net equity value of real estate assets"
          icon={PieChart}
          trend="Net Asset Value"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Total Saleable Footprint"
          value={`${(totalAreaSqft / 100000).toFixed(2)} L Sq. Ft.`}
          subtext="Constructible saleable area"
          icon={Building2}
          trend="Real Estate Area"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Active Projects Portfolio"
          value={`${valuations.length} Developments`}
          subtext="Under active execution & management"
          icon={Layers}
          trend="Active Sites"
          trendDirection="up"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading portfolio valuations...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Portfolio Valuation Register Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : valuations.length === 0 ? (
        <CorporateEmptyState
          title="No Portfolio Valuations Found"
          description="No active developments on record."
          icon={TrendingUp}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Development Project</TableHead>
                <TableHead className="text-xs font-semibold">Asset Category</TableHead>
                <TableHead className="text-xs font-semibold text-right">Total Saleable Area</TableHead>
                <TableHead className="text-xs font-semibold text-right">Avg Realized Rate (₹/Sq. Ft.)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Gross Valuation (₹ Cr)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Net Asset Value (₹ Cr)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valuations.map((v) => (
                <TableRow key={v.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {v.projectName}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {v.developmentType}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono text-muted-foreground">
                    {v.totalSaleableAreaSqft.toLocaleString("en-IN")} Sq. Ft.
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                    ₹{v.avgRealizedRatePerSqft.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-bold text-primary text-sm">
                    ₹{v.grossDevelopmentValueCr.toFixed(2)} Cr
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-bold text-emerald-800">
                    ₹{v.netAssetValueCr.toFixed(2)} Cr
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                      {v.status}
                    </Badge>
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
