"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { hrApi, HrApprovalItem } from "@/services/hrApi";

interface HrApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function HrApprovalDrawer({ isOpen, onClose, onRefresh }: HrApprovalDrawerProps) {
  const [approvals, setApprovals] = useState<HrApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await hrApi.getPendingApprovals();
      setApprovals(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pending HR approvals could not be loaded");
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
      await hrApi.authorizeApproval(id);
      await loadData();
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payroll disbursement could not be authorized");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      await hrApi.rejectApproval(id, "Rejected by Governance Director");
      await loadData();
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payroll disbursement could not be rejected");
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
            Governance Director HR Authorization Queue
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Human-in-the-Loop executive sign-off for high-value payroll disbursements (&gt; ₹10 Lakhs) and exit settlements (&gt; ₹2 Lakhs).
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading authorization queue...</span>
            </div>
          ) : error ? (
            <CorporateEmptyState
              title="Authorization Error"
              description={error}
              actionLabel="Retry"
              onAction={loadData}
              icon={AlertCircle}
            />
          ) : approvals.length === 0 ? (
            <CorporateEmptyState
              title="No Pending HR Authorizations"
              description="All high-value payroll runs and exit settlements have been fully authorized and released to bank accounts."
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
                          {item.type}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">{item.referenceName}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Requested by: {item.requestedBy}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-mono font-extrabold text-primary">
                        {formatCurrency(item.amount)}
                      </span>
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
                      Reject Disbursement
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
                      Authorize Payroll Disbursement
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
