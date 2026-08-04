"use client";

import React, { useState, useEffect } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Bot, Wrench, Activity, ShieldAlert, Radio, AlertCircle, Loader2 } from "lucide-react";
import { mcpApi, McpSystemOverview } from "@/services/mcpApi";

export function McpOverviewView() {
  const [overview, setOverview] = useState<McpSystemOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await mcpApi.getOverview();
      setOverview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Agent gateway status could not be loaded");
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
        <span>Loading agent gateway status...</span>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <CorporateEmptyState
        title="MCP Protocol Gateway Offline"
        description={error || "Agent gateway is currently unreachable."}
        actionLabel="Retry Gateway Query"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Model Context Protocol (MCP) Server Infrastructure
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Active Connected Agents"
          value={overview.activeAgentsCount.toString()}
          subtext="Authenticated Sessions"
          icon={Bot}
          trend="Role-Scoped Access"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Registered MCP Tools"
          value={overview.registeredToolsCount.toString()}
          subtext="Cross-Module Tools"
          icon={Wrench}
          trend="17 ERP Modules Covered"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Total 24h Tool Executions"
          value={overview.totalExecutions24h.toString()}
          subtext="Logged Invocations"
          icon={Activity}
          trend="Audit Stream Active"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Pending HITL Escrow Requests"
          value={overview.pendingHitlRequestsCount.toString()}
          subtext="Requires Director Approval"
          icon={ShieldAlert}
          trend="Mutative Action Guarded"
          trendDirection={overview.pendingHitlRequestsCount > 0 ? "down" : "up"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-800 animate-pulse" />
            MCP Protocol & Gateway Config
          </h4>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Protocol Specification</span>
              <span className="font-bold text-foreground">{overview.protocolVersion}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Transport Connection State</span>
              <span className="font-bold text-emerald-800">{overview.transportState}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">JSON-RPC 2.0 Message Schema</span>
              <span className="font-bold text-foreground">STRICT_VALIDATION_ENFORCED</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Resource Read Subscription</span>
              <span className="font-bold text-emerald-800">ACTIVE (Real-Time Push)</span>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-foreground border-b border-border pb-2">
            AI Agent Governance & HITL Policy Summary
          </h4>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Read-Only Query Operations</span>
              <span className="font-bold text-emerald-800">AUTONOMOUS (Allowed)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Financial Disbursement Tools</span>
              <span className="font-bold text-amber-900">HITL GUARDED (&gt; ₹1 Lakh)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">RA Bill & Payroll Approvals</span>
              <span className="font-bold text-amber-900">HITL INTERCEPTED (Mandatory)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Legal Contract & Deed Issuance</span>
              <span className="font-bold text-amber-900">HITL INTERCEPTED (Mandatory)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
