"use client";

import React, { useState, useEffect } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Wrench, Activity, ShieldAlert, Radio, AlertCircle, Loader2, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react";
import { mcpApi, McpSystemOverview } from "@/services/mcpApi";

interface McpOverviewViewProps {
  onOpenGovernanceQueue?: () => void;
}

export function McpOverviewView({ onOpenGovernanceQueue }: McpOverviewViewProps) {
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
        <span>Auditing real-time MCP gateway and database connections...</span>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <CorporateEmptyState
        title="MCP Gateway Service Offline"
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
            Model Context Protocol (MCP) Enterprise Infrastructure
          </h3>
          <p className="text-xs text-muted-foreground">
            Multi-tenant AI tool dispatch, human-in-the-loop governance escrow, and telemetry audit ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          {overview.pendingHitlRequestsCount > 0 && onOpenGovernanceQueue && (
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={onOpenGovernanceQueue}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Review {overview.pendingHitlRequestsCount} Intercepted Request{overview.pendingHitlRequestsCount > 1 ? "s" : ""}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium gap-1.5"
            onClick={loadData}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Telemetry</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Active Connected Agents"
          value={overview.activeAgentsCount.toString()}
          subtext="Authenticated Agent Sessions"
          icon={Bot}
          trend="Role-Scoped Access"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Registered MCP Tools"
          value={overview.registeredToolsCount.toString()}
          subtext="Live Core ERP Endpoints"
          icon={Wrench}
          trend="Multi-Module Matrix"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Tool Invocations & Audits"
          value={overview.totalExecutions24h.toString()}
          subtext="Logged Invocations"
          icon={Activity}
          trend="Audit Ledger Synced"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Pending Escrow Requests"
          value={overview.pendingHitlRequestsCount.toString()}
          subtext="Awaiting Director Review"
          icon={ShieldAlert}
          trend={overview.pendingHitlRequestsCount > 0 ? "Action Required" : "Zero Backlog"}
          trendDirection={overview.pendingHitlRequestsCount > 0 ? "down" : "up"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary animate-pulse" />
              Protocol Gateway & Runtime Config
            </h4>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 bg-emerald-500/10 border-emerald-500/30">
              OPERATIONAL
            </Badge>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Protocol Specification</span>
              <span className="font-bold text-foreground">JSON-RPC 2.0 (2024-11-05)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">HTTP Transport Endpoint</span>
              <span className="font-bold text-foreground">/api/v1/mcp</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Schema Validation</span>
              <span className="font-bold text-foreground">Strict JSON Schema Enforced</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Audit Stream Immutability</span>
              <span className="font-bold text-foreground">PostgreSQL Append-Only Log</span>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-xs font-bold text-foreground">
              Governance & Execution Boundary Policies
            </h4>
            <Badge variant="outline" className="text-[10px] font-mono">
              POLICY v2.4
            </Badge>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Read-Only Query Operations</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Autonomous
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Procurement Purchase Orders</span>
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Escrow &gt; ₹1 Lakh
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Tally Voucher Postings</span>
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Escrow &gt; ₹10 Lakhs
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Sales Bookings & Payroll</span>
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Mandatory Human Approval
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
