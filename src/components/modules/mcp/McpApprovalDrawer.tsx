"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { mcpApi, McpApprovalItem } from "@/services/mcpApi";

interface McpApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function McpApprovalDrawer({ isOpen, onClose, onRefresh }: McpApprovalDrawerProps) {
  const [approvals, setApprovals] = useState<McpApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await mcpApi.getPendingApprovals();
      setApprovals(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pending MCP tool calls could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleAuthorize = async (id: string) => {
    try {
      setProcessingId(id);
      await mcpApi.authorizeApproval(id);
      await loadData();
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI execution could not be authorized");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      await mcpApi.rejectApproval(id, "Denied by Governance Director");
      await loadData();
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI execution could not be rejected");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl border-border bg-card p-6 overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border space-y-1">
          <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-700" />
            Governance Director AI Tool Interception Queue
          </SheetTitle>
          <SheetDescription className="sr-only">
            Authorization required before an agent may commit a transaction.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading intercepted agent actions...</span>
            </div>
          ) : error ? (
            <CorporateEmptyState
              title="Escalation Error"
              description={error}
              actionLabel="Retry"
              onAction={loadData}
              icon={AlertCircle}
            />
          ) : approvals.length === 0 ? (
            <CorporateEmptyState
              title="No Intercepted AI Tool Executions"
              description="All mutative AI agent tool invocations have been authorized or denied. Zero pending escalations."
              actionLabel="Refresh Queue"
              onAction={loadData}
              icon={CheckCircle2}
            />
          ) : (
            <div className="space-y-4">
              {approvals.map((item) => (
                <div key={item.id} className="border border-border rounded-lg p-4 bg-muted/20 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300 font-mono">
                          {item.invokedTool}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">{item.agentTitle}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Target Module: {item.targetModule}</p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-card border border-border rounded space-y-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Requested Parameters</div>
                    <p className="text-[11px] text-foreground font-mono whitespace-pre-wrap">{item.parametersSummary}</p>
                  </div>

                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-950 font-mono">
                    Justification: {item.justification}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-red-900 border-red-300 hover:bg-red-50 gap-1"
                      onClick={() => handleReject(item.id)}
                      disabled={processingId === item.id}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Deny AI Request
                    </Button>

                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1 bg-emerald-800 hover:bg-emerald-900 text-white"
                      onClick={() => handleAuthorize(item.id)}
                      disabled={processingId === item.id}
                    >
                      {processingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Authorize AI Execution
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
