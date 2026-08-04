"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { facilityApi, UnitHandover } from "@/services/facilityApi";

interface FacilityApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onHandoverProcessed: () => void;
}

export function FacilityApprovalDrawer({
  isOpen,
  onClose,
  onHandoverProcessed,
}: FacilityApprovalDrawerProps) {
  const [pendingHandovers, setPendingHandovers] = useState<UnitHandover[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingHandover, setRejectingHandover] = useState<UnitHandover | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const loadPending = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await facilityApi.getPendingApprovals();
      setPendingHandovers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pending facility approvals could not be loaded");
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
    try {
      setProcessingId(id);
      await facilityApi.authorizeHandover(id);
      loadPending();
      onHandoverProcessed();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Handover request could not be authorized");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingHandover) return;
    try {
      setProcessingId(rejectingHandover.id);
      await facilityApi.rejectHandover(rejectingHandover.id, rejectionReason);
      setRejectingHandover(null);
      setRejectionReason("");
      loadPending();
      onHandoverProcessed();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Handover request could not be rejected");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-6 bg-card text-card-foreground overflow-y-auto">
          <SheetHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono border-amber-300 bg-amber-50 text-amber-950">
                OPERATIONS DIRECTOR GOVERNANCE
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                HANDOVER OVERRIDE QUEUE
              </span>
            </div>
            <SheetTitle className="text-base font-bold font-heading flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-700" />
              Facility Operations Approval Queue
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Review and authorize conditional unit possession handovers with outstanding finance balances or incomplete punch items.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading pending operations authorizations...
              </div>
            ) : pendingHandovers.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-foreground">No Pending Facility Approvals</h4>
                <p className="text-[11px] text-muted-foreground mt-1">
                  All conditional possession requests and major asset expenditures have been reviewed by the Operations Director.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingHandovers.map((h) => (
                  <div key={h.id} className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-foreground block">
                          {h.unitName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Buyer: {h.buyerName} • Ref: {h.handoverReference}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                        Pending Override
                      </Badge>
                    </div>

                    <div className="bg-muted/30 p-3 rounded border border-border space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">De-Snagging Progress</span>
                        <span className="font-semibold text-foreground">{h.desnaggingCompletionPct}% Completed</span>
                      </div>
                      <div className="flex justify-between text-amber-900 font-bold">
                        <span>Outstanding Dues</span>
                        <span>₹{h.outstandingBalance.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target Handover</span>
                        <span className="font-semibold text-foreground">{h.targetHandoverDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-8 text-xs font-medium flex-1 bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                        onClick={() => handleAuthorize(h.id)}
                        disabled={processingId === h.id}
                      >
                        {processingId === h.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Authorize Handover Override
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 gap-1.5"
                        onClick={() => setRejectingHandover(h)}
                        disabled={processingId === h.id}
                      >
                        <XCircle className="h-3.5 w-3.5 text-rose-700" />
                        Reject Request
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!rejectingHandover} onOpenChange={(open) => !open && setRejectingHandover(null)}>
        <DialogContent className="sm:max-w-md w-full p-6 bg-card text-card-foreground">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold font-heading text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-700" />
              Reject Handover Request
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide formal reason for rejecting possession handover for {rejectingHandover?.unitName}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2 text-xs">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Outstanding financial balance must be cleared in full before key issuance."
              className="text-xs min-h-[90px]"
            />
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRejectingHandover(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-medium bg-rose-700 hover:bg-rose-800 text-white"
              onClick={handleConfirmReject}
              disabled={!rejectionReason || processingId === rejectingHandover?.id}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
