"use client";

import React from "react";

interface CorporateStatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
}

export function CorporateStatCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  trendDirection = "neutral",
}: CorporateStatCardProps) {
  return (
    <div className="bg-card text-card-foreground rounded-lg border border-border p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-lg font-bold text-foreground tracking-tight font-heading">
          {value}
        </div>
        {trend && (
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              trendDirection === "up"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : trendDirection === "down"
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      {subtext && <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}
