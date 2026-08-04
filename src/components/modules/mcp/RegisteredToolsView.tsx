"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Wrench, ShieldAlert, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { mcpApi, McpRegisteredTool } from "@/services/mcpApi";

export function RegisteredToolsView() {
  const [tools, setTools] = useState<McpRegisteredTool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await mcpApi.getTools();
      setTools(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registered agent tools could not be loaded");
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
        <span>Loading registered MCP tools directory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Tool Directory Unreachable"
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
            Registered Agent Tools
          </h3>
        </div>
      </div>

      {tools.length === 0 ? (
        <CorporateEmptyState
          title="No Registered MCP Tools"
          description="No agent tools registered yet."
          actionLabel="Refresh Tools"
          onAction={loadData}
          icon={Wrench}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Tool Identifier</TableHead>
                <TableHead className="text-xs font-semibold">Target Module</TableHead>
                <TableHead className="text-xs font-semibold">Description</TableHead>
                <TableHead className="text-xs font-semibold">Execution Capability</TableHead>
                <TableHead className="text-xs font-semibold text-center">Invocations</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                    {t.toolName}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {t.targetModule}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground">
                    {t.description}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {t.requiresHitl ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300 gap-1">
                        <ShieldAlert className="h-3 w-3 text-amber-700" />
                        HITL Restricted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300 gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                        Autonomous
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                    {t.executionCount}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <Button variant="outline" size="sm" className="h-7 text-[11px]">
                      View Specification
                    </Button>
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
