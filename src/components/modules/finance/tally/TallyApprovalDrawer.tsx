"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ShieldAlert, CheckCircle2, XCircle, FileText } from "lucide-react";
import { tallyErpApi, TallyVoucher } from "@/services/tallyErpApi";

interface TallyApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function TallyApprovalDrawer({ isOpen, onClose, onRefresh }: TallyApprovalDrawerProps) {
  const [pendingVouchers, setPendingVouchers] = useState<TallyVoucher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPending = async () => {
    setIsLoading(true);
    try {
      const data = await tallyErpApi.fetchPendingApprovals();
      setPendingVouchers(data);
    } catch {
      setPendingVouchers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPending();
    }
  }, [isOpen]);

  const handleAuthorize = async (id: string) => {
    setProcessingId(id);
    try {
      await tallyErpApi.authorizeVoucher(id);
      await loadPending();
      if (onRefresh) onRefresh();
    } catch {
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await tallyErpApi.rejectVoucher(id);
      await loadPending();
      if (onRefresh) onRefresh();
    } catch {
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl bg-card text-card-foreground border-border p-6 flex flex-col">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-700" />
            <SheetTitle className="text-base font-bold font-heading">
              Governance Director HITL Financial Intercepts
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Review and authorize vouchers exceeding ₹10 Lakhs, PO budget encumbrances, or manual overrides.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading pending governance approvals...
            </div>
          ) : pendingVouchers.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-lg bg-muted/20 my-4 space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-700" />
              <div className="text-sm font-semibold">Zero Pending HITL Intercepts</div>
              <div className="text-xs text-muted-foreground">
                All financial vouchers have been processed or authorized.
              </div>
            </div>
          ) : (
            pendingVouchers.map((v) => (
              <div key={v.id} className="p-4 border border-border rounded-lg bg-card space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold font-mono">{v.voucherNumber}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                    Threshold &gt; ₹10 Lakhs
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Voucher Type:</span>{" "}
                    <span className="font-semibold">{v.voucherType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Posting Date:</span>{" "}
                    <span className="font-mono">{v.postingDate.split("T")[0]}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Debit Ledger:</span>{" "}
                    <span className="font-medium">{v.debitLedgerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Credit Ledger:</span>{" "}
                    <span className="font-medium">{v.creditLedgerName}</span>
                  </div>
                </div>

                <div className="p-2 bg-muted/30 border border-border rounded flex justify-between items-center text-xs">
                  <span className="font-medium text-muted-foreground">Transaction Value:</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    ₹{v.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                {v.narration && (
                  <div className="text-[11px] text-muted-foreground bg-muted/20 p-2 rounded border border-border">
                    {v.narration}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                    disabled={processingId === v.id}
                    onClick={() => handleReject(v.id)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject Financial Voucher
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white gap-1"
                    disabled={processingId === v.id}
                    onClick={() => handleAuthorize(v.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Authorize Ledger Posting
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <SheetFooter className="pt-3 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onClose}>
            Close Drawer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
