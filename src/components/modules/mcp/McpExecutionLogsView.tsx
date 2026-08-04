"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Activity, ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import { mcpApi, McpExecutionLog } from "@/services/mcpApi";

export function McpExecutionLogsView() {
  const [logs, setLogs] = useState<McpExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading agent execution log...</span>
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
        </div>
      </div>

      {logs.length === 0 ? (
        <CorporateEmptyState
          title="No Agent Tool Executions Logged"
          description="No agent activity recorded yet."
          actionLabel="Refresh Audit Feed"
          onAction={loadData}
          icon={Activity}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">UTC Timestamp</TableHead>
                <TableHead className="text-xs font-semibold">Agent Title</TableHead>
                <TableHead className="text-xs font-semibold">Invoked Tool</TableHead>
                <TableHead className="text-xs font-semibold">Parameters Summary</TableHead>
                <TableHead className="text-xs font-semibold text-right">Latency</TableHead>
                <TableHead className="text-xs font-semibold text-center">Execution Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {new Date(l.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {l.agentTitle}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                    {l.invokedTool}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground font-mono">
                    {l.parametersSummary}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                    {l.latencyMs} ms
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    {l.status === "SUCCESS" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                        SUCCESS
                      </Badge>
                    ) : l.status === "HITL_INTERCEPTED" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300 gap-1">
                        <ShieldAlert className="h-3 w-3 text-amber-700" />
                        HITL INTERCEPTED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
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
    </div>
  );
}
