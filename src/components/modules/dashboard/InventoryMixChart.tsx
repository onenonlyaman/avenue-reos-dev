"use client";

import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { InventoryMixSlice } from "@/services/dashboardApi";
import { Building2 } from "lucide-react";

interface InventoryMixChartProps {
  data: InventoryMixSlice[];
  totalUnits: number;
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  BOOKED: "Booked",
  RESERVED: "Reserved",
  BLOCKED: "Blocked",
};

const SLICE_COLORS = ["#059669", "#4f46e5", "#d97706", "#dc2626", "#0891b2", "#7c3aed"];

export function InventoryMixChart({ data, totalUnits }: InventoryMixChartProps) {
  const slices = data.map((slice) => ({
    name: STATUS_LABELS[slice.status] || slice.status,
    value: slice.count,
  }));

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs p-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <h3 className="text-sm font-bold font-heading text-foreground">Tower Inventory Mix</h3>
        <span className="text-[11px] text-muted-foreground font-mono">{totalUnits} units</span>
      </div>

      {slices.length === 0 ? (
        <CorporateEmptyState
          title="No Units Registered"
          description="Unit inventory appears here once towers are configured."
          icon={Building2}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center pt-4">
          <div className="relative">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                >
                  {slices.map((slice, index) => (
                    <Cell key={slice.name} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold font-mono text-foreground">{totalUnits}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Units</span>
            </div>
          </div>

          <div className="w-full space-y-1.5 pt-4">
            {slices.map((slice, index) => (
              <div key={slice.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{slice.name}</span>
                </div>
                <span className="font-mono font-semibold text-foreground">
                  {slice.value}
                  <span className="text-muted-foreground font-normal ml-1">
                    ({totalUnits > 0 ? ((slice.value / totalUnits) * 100).toFixed(0) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
