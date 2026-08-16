"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Activity, ShieldAlert, AlertCircle, Loader2, RefreshCw, Search, Code2, CheckCircle2, XCircle } from "lucide-react";
import { mcpApi, McpExecutionLog } from "@/services/mcpApi";

export function McpExecutionLogsView() {
  const [logs, setLogs] = useState<McpExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<McpExecutionLog | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await mcpApi.getLogs();
      setLogs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "MCP execution logs could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.invokedTool.toLowerCase().includes(q) ||
        l.agentTitle.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q) ||
        l.parametersSummary.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading immutable agent execution audit stream from database...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Execution Audit Unreachable"
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
            Immutable AI Agent Tool Execution Audit Stream
          </h3>
          <p className="text-xs text-muted-foreground">
            Append-only telemetry log recording every invocation, latency, parameters, and outcome
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter by tool or agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium gap-1.5 shrink-0"
            onClick={loadData}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Feed</span>
          </Button>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <CorporateEmptyState
          title={searchQuery ? "No Matching Execution Logs" : "No Agent Tool Executions Logged"}
          description={
            searchQuery
              ? `No execution audit entries match '${searchQuery}'.`
              : "No agent activity recorded yet. Invocations from AI agents will stream here."
          }
          actionLabel={searchQuery ? "Clear Search" : "Refresh Audit Feed"}
          onAction={() => (searchQuery ? setSearchQuery("") : loadData())}
          icon={Activity}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Timestamp (IST)</TableHead>
                <TableHead className="text-xs font-semibold">Agent Title</TableHead>
                <TableHead className="text-xs font-semibold">Invoked Tool</TableHead>
                <TableHead className="text-xs font-semibold">Parameters Summary</TableHead>
                <TableHead className="text-xs font-semibold text-right">Latency</TableHead>
                <TableHead className="text-xs font-semibold text-center">Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {l.agentTitle}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                    {l.invokedTool}
                  </TableCell>
                  <TableCell className="text-xs py-3 max-w-xs">
                    <button
                      onClick={() => setSelectedLog(l)}
                      className="text-left font-mono text-[11px] text-muted-foreground hover:text-primary truncate block w-full underline decoration-dotted"
                      title="Click to view full payload"
                    >
                      {l.parametersSummary}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                    {l.latencyMs} ms
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    {l.status === "SUCCESS" ? (
                      <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 border-emerald-500/30 gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        SUCCESS
                      </Badge>
                    ) : l.status === "HITL_INTERCEPTED" ? (
                      <Badge variant="outline" className="text-[10px] font-bold text-amber-700 bg-amber-500/10 border-amber-500/30 gap-1">
                        <ShieldAlert className="h-3 w-3 text-amber-600" />
                        HITL ESCROW
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold text-destructive bg-destructive/10 border-destructive/30 gap-1">
                        <XCircle className="h-3 w-3 text-destructive" />
                        FAILED
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Full Parameters Payload Modal Dialog */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              Invocation Trace: {selectedLog?.invokedTool}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Caller: {selectedLog?.agentTitle} • Latency: {selectedLog?.latencyMs}ms
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">Parameters Payload:</span>
                <pre className="p-3 bg-muted rounded-lg border border-border text-[11px] font-mono overflow-x-auto text-foreground whitespace-pre-wrap">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.parametersSummary), null, 2);
                    } catch {
                      return selectedLog.parametersSummary;
                    }
                  })()}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedLog(null)}>
                  Close Trace
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
