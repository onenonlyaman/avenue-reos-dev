"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, DollarSign, ShieldAlert, TrendingUp } from "lucide-react";
import { DashboardSummary } from "@/services/dashboardApi";

interface DashboardKpiGridProps {
  summary: DashboardSummary | null;
  isLoading: boolean;
}

export function DashboardKpiGrid({ summary, isLoading }: DashboardKpiGridProps) {
  const cards = [
    {
      title: "Sales Pipeline Demand",
      icon: TrendingUp,
      value: summary ? `₹${summary.salesPipelineDemand.toFixed(2)} Cr` : "₹0.00 Cr",
      detail: summary ? `${summary.qualifiedLeadsCount} Active Qualified Leads` : "0 Active Qualified Leads",
      detailIcon: TrendingUp,
    },
    {
      title: "Tower Inventory Realization",
      icon: Building2,
      value: summary ? `${summary.inventoryRealizationPct.toFixed(1)}%` : "0.0%",
      detail: summary
        ? `${summary.totalRegisteredUnits} Registered Units in Portfolio`
        : "0 Registered Units in Portfolio",
      detailIcon: Building2,
    },
    {
      title: "Committed Budget Liabilities",
      icon: DollarSign,
      value: summary ? `₹${summary.committedLiabilities.toFixed(2)} Cr` : "₹0.00 Cr",
      detail: summary ? `${summary.activeCostCenterPOs} Active Cost Center POs` : "0 Active Cost Center POs",
      detailIcon: DollarSign,
    },
    {
      title: "Automated HITL Approvals",
      icon: ShieldAlert,
      value: summary ? `${summary.pendingHitlApprovals} Pending` : "0 Pending",
      detail: "Executive Approval Guards",
      detailIcon: ShieldAlert,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const DetailIcon = card.detailIcon;

        return (
          <Card key={card.title} className="bg-card border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2 py-0.5">
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-3.5 w-44 mt-1" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground font-mono">{card.value}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <DetailIcon className="h-3 w-3" />
                    <span>{card.detail}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
