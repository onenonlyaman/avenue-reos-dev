"use client";

import React from "react";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { SalesFunnelStage } from "@/services/dashboardApi";
import { Filter } from "lucide-react";

interface SalesFunnelPanelProps {
  stages: SalesFunnelStage[];
}

export function SalesFunnelPanel({ stages }: SalesFunnelPanelProps) {
  const peak = stages.reduce((max, stage) => Math.max(max, stage.count), 0);
  const hasVolume = peak > 0;

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs p-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <h3 className="text-sm font-bold font-heading text-foreground">Sales Conversion Funnel</h3>
      </div>

      {!hasVolume ? (
        <CorporateEmptyState
          title="No Pipeline Volume"
          description="Prospect and booking progression appears here once records are captured."
          icon={Filter}
        />
      ) : (
        <div className="flex-1 space-y-3 pt-4">
          {stages.map((stage) => {
            const width = peak > 0 ? Math.max((stage.count / peak) * 100, stage.count > 0 ? 6 : 2) : 2;
            return (
              <div key={stage.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{stage.stage}</span>
                  <span className="font-mono font-semibold text-foreground">{stage.count}</span>
                </div>
                <div className="h-2 w-full rounded-sm bg-muted overflow-hidden">
                  <div className="h-full rounded-sm bg-primary" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
