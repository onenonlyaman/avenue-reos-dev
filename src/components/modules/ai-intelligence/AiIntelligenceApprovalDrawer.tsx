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
import { aiIntelligenceApi, AiIntelligenceApprovalItem } from "@/services/aiIntelligenceApi";

interface AiIntelligenceApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function AiIntelligenceApprovalDrawer({ isOpen, onClose, onRefresh }: AiIntelligenceApprovalDrawerProps) {
  const [approvals, setApprovals] = useState<AiIntelligenceApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await aiIntelligenceApi.getPendingApprovals();
      setApprovals(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pending AI approvals could not be loaded");
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
      await aiIntelligenceApi.authorizeApproval(id);
      await loadData();
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI output could not be authorized");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      await aiIntelligenceApi.rejectApproval(id, "Rejected by Governance Director");
      await loadData();
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI output could not be rejected");
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl border-border bg-card p-6 overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border space-y-1">
          <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-700" />
            Governance Director AI Intelligence Verification Queue
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Human-in-the-Loop executive verification for legal deeds, fraud alerts, and commodity buy recommendations (&gt; ₹10 Lakhs).
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading verification queue...</span>
            </div>
          ) : error ? (
            <CorporateEmptyState
              title="Verification Error"
              description={error}
              actionLabel="Retry"
              onAction={loadData}
              icon={AlertCircle}
            />
          ) : approvals.length === 0 ? (
            <CorporateEmptyState
              title="No Pending AI Verification Requests"
              description="All AI generated legal deeds, fraud alerts, and high-value commodity recommendations have been reviewed and authorized."
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
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                          {item.category}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Target: {item.targetReference}</p>
                    </div>

                    <div className="text-right">
                      {item.amount > 0 && (
                        <span className="text-sm font-mono font-extrabold text-primary">
                          {formatCurrency(item.amount)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 bg-card border border-border rounded text-[11px] text-muted-foreground font-mono">
                    {item.justification}
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
                      Reject AI Output
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
                      Authorize AI Generation
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
