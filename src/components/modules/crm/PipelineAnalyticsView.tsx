"use client";

import React, { useEffect, useState } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { TrendingUp, DollarSign, Building2, Users, Loader2, UserCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface RepRealization {
  name: string;
  role: string;
  realizedRevenueCr: number;
  bookedUnitsCount: number;
}

interface AnalyticsData {
  quarterlyPipelineRealizationCr: number;
  activeProspectCount: number;
  averageUnitRealizationCr: number;
  inventoryVelocityPct: number;
  totalUnitsCount: number;
  bookedUnitsCount: number;
  funnelStages: { stage: string; count: number; valueLakhs: number; conversion: string }[];
  projectPerformance: {
    name: string;
    totalUnits: number;
    bookedUnits: number;
    occupancy: string;
    realizedRevenueCr: string;
    targetRevenueCr: string;
  }[];
  salesRepRealization?: RepRealization[];
}

export function PipelineAnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/crm/analytics");
      const envelope = await res.json();
      if (envelope.success && envelope.data) {
        setData(envelope.data);
      }
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Calculating sales analytics...</span>
      </div>
    );
  }

  if (!data || (data.activeProspectCount === 0 && data.totalUnitsCount === 0 && data.bookedUnitsCount === 0)) {
    return (
      <CorporateEmptyState
        title="No CRM Analytics Records Found"
        description="No prospects or bookings available for analysis."
        actionLabel="Refresh Analytics Data"
        onAction={loadAnalytics}
      />
    );
  }

  const salesReps = data.salesRepRealization || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Quarterly Pipeline Realization"
          value={`₹${data.quarterlyPipelineRealizationCr.toFixed(2)} Cr`}
          subtext="Total contracted sales bookings value"
          icon={TrendingUp}
          trend="Portfolio Total"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Active Prospect Inventory"
          value={`${data.activeProspectCount} Prospects`}
          subtext="Ingested qualified CRM leads"
          icon={Users}
          trend="Active Records"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Average Unit Realization"
          value={`₹${data.averageUnitRealizationCr.toFixed(2)} Cr`}
          subtext="Average booked unit price"
          icon={DollarSign}
          trend="Portfolio Average"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Total Inventory Velocity"
          value={`${data.inventoryVelocityPct}%`}
          subtext={`${data.bookedUnitsCount} of ${data.totalUnitsCount} units contracted`}
          icon={Building2}
          trend="Velocity Index"
          trendDirection="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card text-card-foreground p-5 rounded-lg border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold font-heading text-foreground">
                Commercial Pipeline Conversion Funnel
              </h3>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              REAL-TIME PIPELINE
            </Badge>
          </div>

          <div className="space-y-3 pt-1">
            {data.funnelStages.map((stage) => {
              const numericPct = parseFloat(stage.conversion.replace("%", "")) || 0;
              const barWidth = Math.max(4, Math.min(100, numericPct));

              return (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground">{stage.stage}</span>
                    <span className="font-mono text-muted-foreground">
                      {stage.count} ({stage.conversion}) • ₹{stage.valueLakhs} L
                    </span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card text-card-foreground p-5 rounded-lg border border-border shadow-xs space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-bold font-heading text-foreground">
              Sales Representative Attribution
            </h3>
          </div>

          <div className="space-y-3 text-xs overflow-y-auto max-h-[260px]">
            {salesReps.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No individual sales rep bookings on record yet.
              </div>
            ) : (
              salesReps.map((rep) => (
                <div key={rep.name} className="p-3 bg-muted/30 border border-border rounded flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">{rep.name}</div>
                    <div className="text-[10px] text-muted-foreground">{rep.role}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-bold text-emerald-800">₹{rep.realizedRevenueCr.toFixed(2)} Cr</div>
                    <div className="text-[10px] text-muted-foreground">{rep.bookedUnitsCount} Unit(s) Closed</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-bold font-heading text-foreground">
            Development Site Portfolio Performance Summary
          </h3>
        </div>

        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-semibold">Development Project Name</TableHead>
              <TableHead className="text-xs font-semibold text-center">Total Inventory</TableHead>
              <TableHead className="text-xs font-semibold text-center">Booked Units</TableHead>
              <TableHead className="text-xs font-semibold text-center">Occupancy Rate</TableHead>
              <TableHead className="text-xs font-semibold text-right">Realized Revenue</TableHead>
              <TableHead className="text-xs font-semibold text-right">Sanctioned Budget</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.projectPerformance.map((project) => (
              <TableRow key={project.name} className="hover:bg-muted/30">
                <TableCell className="font-medium text-xs py-3 text-foreground">
                  {project.name}
                </TableCell>
                <TableCell className="text-xs py-3 text-center font-mono">
                  {project.totalUnits} Units
                </TableCell>
                <TableCell className="text-xs py-3 text-center font-mono font-medium text-emerald-800">
                  {project.bookedUnits} Units
                </TableCell>
                <TableCell className="text-xs py-3 text-center font-mono">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-950 border-emerald-300 text-[10px]">
                    {project.occupancy}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                  {project.realizedRevenueCr}
                </TableCell>
                <TableCell className="text-xs py-3 text-right font-mono text-muted-foreground">
                  {project.targetRevenueCr}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
