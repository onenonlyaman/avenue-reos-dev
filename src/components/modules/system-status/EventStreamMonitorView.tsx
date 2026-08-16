"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Radio, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { EventStreamLog, systemApi } from "@/services/systemApi";

export function EventStreamMonitorView() {
  const [logs, setLogs] = useState<EventStreamLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isManual = false) => {
    try {
      if (isManual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const data = await systemApi.getEventStreamLogs();
      setLogs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Platform event log could not be loaded");
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
        <span>Loading platform event bus log...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Event Stream Service Unreachable"
        description={error}
        actionLabel="Retry Connection"
        onAction={() => loadData(false)}
        icon={AlertCircle}
      />
    );
  }

  if (logs.length === 0) {
    return (
      <CorporateEmptyState
        title="No Event Bus Activity"
        description="No cross-module events have been recorded yet. Events propagate automatically as CRM bookings, RA bills, purchase orders, or land acquisitions are transacted."
        actionLabel="Refresh Monitor"
        onAction={() => loadData(false)}
        icon={Radio}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            NATS JetStream Cross-Module Event Bus Monitor
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit trail of asynchronous domain events propagated between real estate operational registers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            {logs.length} Recent Events Logged
          </span>
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
              <TableHead className="text-xs font-semibold">Timestamp (IST)</TableHead>
              <TableHead className="text-xs font-semibold">Event Signature</TableHead>
              <TableHead className="text-xs font-semibold">Origin Module</TableHead>
              <TableHead className="text-xs font-semibold">Target Consumer</TableHead>
              <TableHead className="text-xs font-semibold">Recorded Action</TableHead>
              <TableHead className="text-xs font-semibold text-center">Bus Delivery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                  {new Date(l.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </TableCell>
                <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                  {l.eventName}
                </TableCell>
                <TableCell className="text-xs py-3 font-medium text-foreground">
                  {l.originModule}
                </TableCell>
                <TableCell className="text-xs py-3 font-medium text-foreground">
                  {l.targetModule}
                </TableCell>
                <TableCell className="text-xs py-3 text-muted-foreground font-medium">
                  {l.payloadSummary}
                </TableCell>
                <TableCell className="text-xs py-3 text-center">
                  {l.status === "FAILED" ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">
                      {l.status}
                    </Badge>
                  ) : l.status === "PROCESSING" ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30">
                      {l.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/30">
                      {l.status}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
