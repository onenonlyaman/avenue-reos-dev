"use client";

import React from "react";
import { Briefcase, HardHat, Users, UserSquare2 } from "lucide-react";
import { DashboardSummary } from "@/services/dashboardApi";

interface DashboardSecondaryStatsProps {
  summary: DashboardSummary | null;
}

export function DashboardSecondaryStats({ summary }: DashboardSecondaryStatsProps) {
  const stats = [
    {
      label: "Active Developments",
      value: summary ? String(summary.activeDevelopments) : "0",
      icon: Briefcase,
    },
    {
      label: "Registered Customers",
      value: summary ? String(summary.registeredCustomers) : "0",
      icon: UserSquare2,
    },
    {
      label: "Active Workforce",
      value: summary ? String(summary.activeWorkforce) : "0",
      icon: Users,
    },
    {
      label: "Contractor Claims Awaiting Release",
      value: summary ? `₹${summary.contractorClaimsPendingCr.toFixed(2)} Cr` : "₹0.00 Cr",
      icon: HardHat,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded border border-border bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-foreground font-mono leading-tight">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground truncate">{stat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
