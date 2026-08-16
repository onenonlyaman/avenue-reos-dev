"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ShieldAlert, AlertCircle, Loader2, RefreshCw, ArrowUpRight } from "lucide-react";
import { systemApi, HitlGateSummary } from "@/services/systemApi";

export function HitlAuditSummaryView() {
  const [summary, setSummary] = useState<HitlGateSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async (isManual = false) => {
    try {
      if (isManual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const data = await systemApi.getHitlSummary();
      setSummary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authorization audit summary could not be loaded");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Auditing active Human-in-the-Loop governance queues...</span>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <CorporateEmptyState
        title="HITL Audit Summary Error"
        description={error || "Governance approval queues could not be verified."}
        actionLabel="Retry Verification"
        onAction={() => loadData(false)}
        icon={AlertCircle}
      />
    );
  }

  const gates = [
    {
      module: "Finance ERP Workspace",
      threshold: "Disbursements Exceeding ₹10 Lakhs & High-Value Bookings",
      pendingCount: summary.financePendingCount,
      targetRoute: "/finance",
    },
    {
      module: "Construction & Site Operations",
      threshold: "Contractor RA Bills Exceeding ₹25 Lakhs",
      pendingCount: summary.constructionPendingCount,
      targetRoute: "/construction",
    },
    {
      module: "Procurement & Materials Management",
      threshold: "Purchase Orders Exceeding ₹15 Lakhs",
      pendingCount: summary.procurementPendingCount,
      targetRoute: "/procurement",
    },
    {
      module: "Property & Facility Operations",
      threshold: "Unit Handovers with Outstanding CAM Dues",
      pendingCount: summary.facilityPendingCount,
      targetRoute: "/facility",
    },
    {
      module: "Land & Regulatory Legal",
      threshold: "Land Acquisitions > ₹50L or Encumbered Title",
      pendingCount: summary.legalPendingCount,
      targetRoute: "/legal",
    },
    {
      module: "Executive Analytics & Governance",
      threshold: "Board Capital Deployments > ₹1 Crore",
      pendingCount: summary.boardPendingCount,
      targetRoute: "/analytics",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Unified Human-in-the-Loop (HITL) Executive Governance Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time verification of threshold-triggered compliance queues across all operational registers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs bg-amber-500/10 text-amber-900 dark:text-amber-300 px-3 py-1.5 rounded border border-amber-500/30">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-bold">{summary.totalPendingHitl} Total Pending Authorizations</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-semibold">Executive Governance Module</TableHead>
              <TableHead className="text-xs font-semibold">HITL Safeguard Trigger Threshold</TableHead>
              <TableHead className="text-xs font-semibold text-center">Pending Approvals</TableHead>
              <TableHead className="text-xs font-semibold text-center">Governance Status</TableHead>
              <TableHead className="text-xs font-semibold text-right">Queue Navigation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gates.map((g) => (
              <TableRow key={g.module} className="hover:bg-muted/30 transition-colors">
                <TableCell className="text-xs py-3 font-semibold text-foreground">
                  {g.module}
                </TableCell>
                <TableCell className="text-xs py-3 font-medium text-muted-foreground">
                  {g.threshold}
                </TableCell>
                <TableCell className="text-xs py-3 text-center font-mono font-extrabold text-primary text-sm">
                  {g.pendingCount}
                </TableCell>
                <TableCell className="text-xs py-3 text-center">
                  {g.pendingCount > 0 ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30">
                      Pending Authorization
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/30">
                      Fully Cleared
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs py-3 text-right">
                  <Link href={g.targetRoute}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 hover:text-primary hover:border-primary/50"
                    >
                      <span>View Queue</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
