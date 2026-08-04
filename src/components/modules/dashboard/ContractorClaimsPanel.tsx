"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ContractorClaimGroup, SupportTicketGroup } from "@/services/dashboardApi";
import { HardHat } from "lucide-react";

interface ContractorClaimsPanelProps {
  claims: ContractorClaimGroup[];
  tickets: SupportTicketGroup[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Awaiting Authorization",
  APPROVED: "Authorized",
  REJECTED: "Returned",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  WAITING_CLIENT: "Awaiting Client",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: "#d97706",
  APPROVED: "#059669",
  REJECTED: "#dc2626",
};

export function ContractorClaimsPanel({ claims, tickets }: ContractorClaimsPanelProps) {
  const chartData = claims.map((claim) => ({
    label: STATUS_LABELS[claim.status] || claim.status,
    status: claim.status,
    count: claim.count,
    valueCr: claim.valueCr,
  }));

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs p-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <h3 className="text-sm font-bold font-heading text-foreground">Contractor Claims</h3>
        <span className="text-[11px] text-muted-foreground font-mono">
          {claims.reduce((sum, claim) => sum + claim.count, 0)} claims
        </span>
      </div>

      {chartData.length === 0 ? (
        <CorporateEmptyState
          title="No Contractor Claims"
          description="Running account bills appear here once contractors raise claims."
          icon={HardHat}
        />
      ) : (
        <div className="pt-4">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)" }}
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value) => [Number(value ?? 0), "Claims"]}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#4f46e5"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="space-y-1.5 pt-3 border-t border-border mt-3">
            {claims.map((claim) => (
              <div key={claim.status} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{STATUS_LABELS[claim.status] || claim.status}</span>
                <span className="font-mono font-semibold text-foreground">₹{claim.valueCr.toFixed(2)} Cr</span>
              </div>
            ))}
          </div>

          {tickets.length > 0 && (
            <div className="pt-3 mt-3 border-t border-border space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Buyer Support Desk
              </div>
              {tickets.map((ticket) => (
                <div key={ticket.status} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{STATUS_LABELS[ticket.status] || ticket.status}</span>
                  <span className="font-mono font-semibold text-foreground">{ticket.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
