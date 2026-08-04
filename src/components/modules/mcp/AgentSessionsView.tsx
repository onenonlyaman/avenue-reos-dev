"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Bot, AlertCircle, Loader2 } from "lucide-react";
import { mcpApi, McpAgentSession } from "@/services/mcpApi";

export function AgentSessionsView() {
  const [sessions, setSessions] = useState<McpAgentSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await mcpApi.getSessions();
      setSessions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Agent sessions could not be loaded");
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
        <span>Auditing active AI agent sessions and authentication tokens...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Agent Sessions Unreachable"
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
            Active Connected AI Agent Sessions & Scope Matrix
          </h3>
        </div>
      </div>

      {sessions.length === 0 ? (
        <CorporateEmptyState
          title="No Active AI Agent Sessions"
          description="No agents currently connected."
          actionLabel="Refresh Sessions"
          onAction={loadData}
          icon={Bot}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Agent Title</TableHead>
                <TableHead className="text-xs font-semibold">Assigned Scope</TableHead>
                <TableHead className="text-xs font-semibold">Session Origin IP</TableHead>
                <TableHead className="text-xs font-semibold">Permissions Level</TableHead>
                <TableHead className="text-xs font-semibold">Last Ping</TableHead>
                <TableHead className="text-xs font-semibold text-center">Session Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-1.5">
                      <Bot className="h-4 w-4 text-primary shrink-0" />
                      <span>{s.agentTitle}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {s.assignedScope}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {s.originIp}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <Badge variant="outline" className="text-[10px] font-mono border-border">
                      {s.permissionLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {new Date(s.lastPing).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    {s.sessionStatus === "ACTIVE" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                        ACTIVE
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold bg-muted text-muted-foreground border-border">
                        {s.sessionStatus}
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
