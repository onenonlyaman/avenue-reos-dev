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
import { Wrench, ShieldAlert, CheckCircle2, AlertCircle, Loader2, Search, Code, RefreshCw } from "lucide-react";
import { mcpApi, McpRegisteredTool } from "@/services/mcpApi";

export function RegisteredToolsView() {
  const [tools, setTools] = useState<McpRegisteredTool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTool, setSelectedTool] = useState<McpRegisteredTool | null>(null);

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

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    const q = searchQuery.toLowerCase();
    return tools.filter(
      (t) =>
        t.toolName.toLowerCase().includes(q) ||
        t.targetModule.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [tools, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading registered MCP tools directory from database...</span>
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
            Registered Enterprise Agent Tools
          </h3>
          <p className="text-xs text-muted-foreground">
            Standardized JSON-RPC tools exposed to internal and external AI agents
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tool or module..."
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
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {filteredTools.length === 0 ? (
        <CorporateEmptyState
          title={searchQuery ? "No Matching Tools Found" : "No Registered MCP Tools"}
          description={
            searchQuery
              ? `No registered agent tools match '${searchQuery}'.`
              : "No agent tools registered in the database."
          }
          actionLabel={searchQuery ? "Clear Search" : "Refresh Tools"}
          onAction={() => (searchQuery ? setSearchQuery("") : loadData())}
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
                <TableHead className="text-xs font-semibold">Execution Boundary</TableHead>
                <TableHead className="text-xs font-semibold text-center">Invocations</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTools.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                    <div className="flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{t.toolName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {t.targetModule}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground max-w-xs truncate">
                    {t.description}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {t.requiresHitl ? (
                      <Badge variant="outline" className="text-[10px] font-bold text-amber-700 bg-amber-500/10 border-amber-500/30 gap-1">
                        <ShieldAlert className="h-3 w-3 text-amber-600" />
                        HITL Escrow Guarded
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 border-emerald-500/30 gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Autonomous Execution
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                    {t.executionCount}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 hover:bg-primary/10"
                      onClick={() => setSelectedTool(t)}
                    >
                      <Code className="h-3 w-3" />
                      View Specification
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* JSON Schema Specification Modal Dialog */}
      <Dialog open={Boolean(selectedTool)} onOpenChange={(open) => !open && setSelectedTool(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              Tool Schema: {selectedTool?.toolName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedTool?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedTool && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-muted/50 border border-border space-y-0.5">
                  <span className="text-muted-foreground text-[10px] uppercase block">Target Module</span>
                  <span className="font-bold text-foreground">{selectedTool.targetModule}</span>
                </div>
                <div className="p-2.5 rounded bg-muted/50 border border-border space-y-0.5">
                  <span className="text-muted-foreground text-[10px] uppercase block">Execution Policy</span>
                  <span className="font-bold text-foreground">
                    {selectedTool.requiresHitl ? "Escrow Required (HITL)" : "Autonomous"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">JSON-RPC Input Schema Specification:</span>
                <pre className="p-3 bg-muted rounded-lg border border-border text-[11px] font-mono overflow-x-auto text-foreground">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedTool.schemaInput), null, 2);
                    } catch {
                      return selectedTool.schemaInput;
                    }
                  })()}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedTool(null)}>
                  Close Specification
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
