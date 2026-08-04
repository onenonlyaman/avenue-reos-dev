"use client";

import React from "react";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { BudgetUtilisationRow } from "@/services/dashboardApi";
import { Wallet } from "lucide-react";

interface BudgetUtilisationPanelProps {
  rows: BudgetUtilisationRow[];
}

function utilisationTone(pct: number): string {
  if (pct > 95) return "bg-red-600";
  if (pct >= 80) return "bg-amber-500";
  return "bg-emerald-600";
}

export function BudgetUtilisationPanel({ rows }: BudgetUtilisationPanelProps) {
  const totalAllocated = rows.reduce((sum, row) => sum + row.allocatedLakhs, 0);

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs p-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <h3 className="text-sm font-bold font-heading text-foreground">Cost Centre Utilisation</h3>
        <span className="text-[11px] text-muted-foreground font-mono">
          ₹{totalAllocated.toFixed(2)} L allocated
        </span>
      </div>

      {rows.length === 0 ? (
        <CorporateEmptyState
          title="No Budget Allocations"
          description="Allocate a budget head against a cost centre to track utilisation."
          icon={Wallet}
        />
      ) : (
        <div className="flex-1 space-y-3.5 pt-4">
          {rows.map((row) => (
            <div key={row.costCentre} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-foreground font-medium truncate">{row.costCentre}</span>
                <span className="font-mono text-muted-foreground shrink-0">
                  ₹{(row.committedLakhs + row.spentLakhs).toFixed(2)} L of ₹{row.allocatedLakhs.toFixed(2)} L
                </span>
              </div>
              <div className="h-2 w-full rounded-sm bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-sm ${utilisationTone(row.utilisationPct)}`}
                  style={{ width: `${Math.min(row.utilisationPct, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Committed ₹{row.committedLakhs.toFixed(2)} L</span>
                <span>Disbursed ₹{row.spentLakhs.toFixed(2)} L</span>
                <span className="font-mono font-semibold text-foreground">{row.utilisationPct.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
