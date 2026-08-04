"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { analyticsApi, CapitalAllocationRequest } from "@/services/analyticsApi";

interface BoardApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCapitalProcessed: () => void;
}

export function BoardApprovalDrawer({
  isOpen,
  onClose,
  onCapitalProcessed,
}: BoardApprovalDrawerProps) {
  const [pendingRequests, setPendingRequests] = useState<CapitalAllocationRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<CapitalAllocationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const loadPending = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await analyticsApi.getPendingApprovals();
      setPendingRequests(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pending board approvals could not be loaded");
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
      await analyticsApi.authorizeCapitalAllocation(id);
      loadPending();
      onCapitalProcessed();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Board capital allocation could not be authorized");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    try {
      setProcessingId(rejectingRequest.id);
      await analyticsApi.rejectCapitalAllocation(rejectingRequest.id, rejectionReason);
      setRejectingRequest(null);
      setRejectionReason("");
      loadPending();
      onCapitalProcessed();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Capital allocation request could not be rejected");
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
                BOARD OF DIRECTORS GOVERNANCE
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                MAJOR CAPITAL ALLOCATION
              </span>
            </div>
            <SheetTitle className="text-base font-bold font-heading flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-700" />
              Board Capital Deployment Queue
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Review and authorize capital expenditure deployments exceeding ₹1 Crore or high-risk project funding overrides.
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
                Loading pending board authorizations...
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-foreground">No Pending Board Approvals</h4>
                <p className="text-[11px] text-muted-foreground mt-1">
                  All major capital deployment requests and risk overrides have been reviewed by the Board of Directors.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((r) => (
                  <div key={r.id} className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-foreground block">
                          {r.projectName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Purpose: {r.allocationPurpose} • Ref: {r.requestReference}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                        Major Capital (&gt; ₹1 Cr)
                      </Badge>
                    </div>

                    <div className="bg-muted/30 p-3 rounded border border-border space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between text-amber-900 font-bold">
                        <span>Requested Capital Amount</span>
                        <span>₹{r.requestedCapitalLakhs.toLocaleString("en-IN")} Lakhs (₹{(r.requestedCapitalLakhs / 100).toFixed(2)} Cr)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Portfolio Risk Assessment</span>
                        <span className="font-semibold text-foreground">{r.riskRating} Risk</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-8 text-xs font-medium flex-1 bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                        onClick={() => handleAuthorize(r.id)}
                        disabled={processingId === r.id}
                      >
                        {processingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Authorize Board Capital Allocation
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 gap-1.5"
                        onClick={() => setRejectingRequest(r)}
                        disabled={processingId === r.id}
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

      <Dialog open={!!rejectingRequest} onOpenChange={(open) => !open && setRejectingRequest(null)}>
        <DialogContent className="sm:max-w-md w-full p-6 bg-card text-card-foreground">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold font-heading text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-700" />
              Reject Capital Allocation Request
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide formal board commentary for rejecting capital request {rejectingRequest?.requestReference}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2 text-xs">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Portfolio DSCR ratio threshold limits additional debt principal commitments at this time."
              className="text-xs min-h-[90px]"
            />
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRejectingRequest(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-medium bg-rose-700 hover:bg-rose-800 text-white"
              onClick={handleConfirmReject}
              disabled={!rejectionReason || processingId === rejectingRequest?.id}
            >
              Confirm Board Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
