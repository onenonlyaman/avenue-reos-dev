"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Radio, AlertCircle, Loader2 } from "lucide-react";
import { EventStreamLog, systemApi } from "@/services/systemApi";

export function EventStreamMonitorView() {
  const [logs, setLogs] = useState<EventStreamLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await systemApi.getEventStreamLogs();
      setLogs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Platform event log could not be loaded");
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
        <span>Loading platform event log...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Event Stream Service Unreachable"
        description={error}
        actionLabel="Retry Connection"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  if (logs.length === 0) {
    return (
      <CorporateEmptyState
        title="No Event Bus Activity"
        description="No cross-module events have been recorded yet. Events propagate as CRM bookings, RA bills, purchase orders, or land acquisitions are transacted."
        actionLabel="Refresh"
        onAction={loadData}
        icon={Radio}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-800 animate-pulse" />
            NATS JetStream Cross-Module Event Bus Monitor
          </h3>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-semibold">UTC Timestamp</TableHead>
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
                    <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                      {l.status}
                    </Badge>
                  ) : l.status === "PROCESSING" ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                      {l.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
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
