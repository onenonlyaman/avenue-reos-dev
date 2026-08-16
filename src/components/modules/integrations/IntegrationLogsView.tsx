"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, ShieldAlert, AlertCircle, Loader2, Eye, FileCode2 } from "lucide-react";
import { integrationsApi, IntegrationLog } from "@/services/integrationsApi";

export function IntegrationLogsView() {
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await integrationsApi.getLogs();
      setLogs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Integration logs could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDateTime = (timestamp: string) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading integration audit log...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Integration Logs Unreachable"
        description={error}
        actionLabel="Retry"
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
            External System API & Webhook Audit Trail
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable log of all incoming webhooks, ERP synchronizations, and gateway transactions.
          </p>
        </div>

        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 font-semibold" onClick={loadData}>
          <Activity className="h-3.5 w-3.5" />
          Refresh Audit Trail
        </Button>
      </div>

      {logs.length === 0 ? (
        <CorporateEmptyState
          title="No Integration Logs Recorded"
          description="No integration activity recorded in the audit register."
          actionLabel="Refresh Audit Feed"
          onAction={loadData}
          icon={Activity}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Timestamp (IST)</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Integration Provider</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Connected Service</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Record Type</TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap">Latency</TableHead>
                  <TableHead className="text-xs font-semibold text-center whitespace-nowrap">Response Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-mono text-muted-foreground whitespace-nowrap">
                      {formatDateTime(l.timestamp)}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-semibold text-foreground whitespace-nowrap">
                      {l.providerName}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono text-foreground whitespace-nowrap">
                      {l.endpoint}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground font-mono whitespace-nowrap">
                      {l.payloadType}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      {l.latencyMs} ms
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center whitespace-nowrap">
                      {l.responseStatus === "SUCCESS" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          SUCCESS
                        </Badge>
                      ) : l.responseStatus === "HITL_INTERCEPTED" || l.responseStatus === "INTERCEPTED" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300 gap-1">
                          <ShieldAlert className="h-3 w-3 text-amber-700" />
                          HITL ESCALATED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                          FAILED
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => setSelectedLog(l)}
                      >
                        <Eye className="h-3 w-3" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {selectedLog && (
        <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="sm:max-w-[500px] border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-primary" />
                Integration Log Inspection
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs font-mono">
              <div className="p-3 bg-muted/40 border border-border rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Log ID:</span>
                  <span className="font-bold text-foreground">{selectedLog.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-bold text-foreground">{selectedLog.providerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Endpoint / Route:</span>
                  <span className="font-bold text-foreground">{selectedLog.endpoint}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payload Type:</span>
                  <span className="font-bold text-foreground">{selectedLog.payloadType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recorded Latency:</span>
                  <span className="font-bold text-foreground">{selectedLog.latencyMs} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Execution Status:</span>
                  <span className="font-bold text-foreground">{selectedLog.responseStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="font-bold text-foreground">{formatDateTime(selectedLog.timestamp)}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
