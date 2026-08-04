"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ShieldAlert, CheckCircle2, XCircle, FileText, UserCheck, Loader2 } from "lucide-react";
import { financeApi, PendingDisbursement } from "@/services/financeApi";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";

interface FinanceApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDisbursementProcessed?: () => void;
}

export function FinanceApprovalDrawer({
  isOpen,
  onClose,
  onDisbursementProcessed,
}: FinanceApprovalDrawerProps) {
  const [queue, setQueue] = useState<PendingDisbursement[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PendingDisbursement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      const res = await financeApi.getPendingApprovals();
      setQueue(res);
      if (res.length > 0) {
        setSelectedRequest(res[0]);
      } else {
        setSelectedRequest(null);
      }
    } catch {
      setQueue([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadApprovals();
    }
  }, [isOpen]);

  const handleAuthorize = async () => {
    if (!selectedRequest) return;
    try {
      setIsProcessing(true);
      await financeApi.authorizeDisbursement(selectedRequest.id);
      const updatedQueue = queue.filter((item) => item.id !== selectedRequest.id);
      setQueue(updatedQueue);
      setSelectedRequest(updatedQueue[0] || null);
      if (onDisbursementProcessed) onDisbursementProcessed();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Disbursement could not be authorized");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    try {
      setIsProcessing(true);
      await financeApi.rejectDisbursement(selectedRequest.id, rejectionReason || "Rejected by CFO");
      const updatedQueue = queue.filter((item) => item.id !== selectedRequest.id);
      setQueue(updatedQueue);
      setSelectedRequest(updatedQueue[0] || null);
      setIsRejectModalOpen(false);
      setRejectionReason("");
      if (onDisbursementProcessed) onDisbursementProcessed();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Disbursement could not be rejected");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="sm:max-w-xl w-full p-6 flex flex-col h-full bg-card text-card-foreground">
          <SheetHeader className="pb-3 border-b border-border space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono bg-amber-50 text-amber-950 border-amber-300">
                EXECUTIVE CFO DISBURSEMENT CONTROL
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {queue.length} Pending Approval(s)
              </span>
            </div>
            <SheetTitle className="text-lg font-bold font-heading flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              CFO HITL Financial Approval Drawer
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Review and authorize high-value disbursements exceeding ₹40 Lakhs and budget exception overrides.
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-2 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading approval queue...</span>
            </div>
          ) : queue.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center">
              <CorporateEmptyState
                title="CFO Disbursement Queue Clear"
                description="There are currently no pending high-value disbursements or manual GL postings requiring CFO HITL sign-off."
                icon={UserCheck}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Pending Authorization Items
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {queue.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedRequest(item)}
                      className={`p-2.5 rounded border text-left shrink-0 w-52 transition-all ${
                        selectedRequest?.id === item.id
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                        <span className="font-bold text-foreground">{item.requestNumber}</span>
                        <span className="text-amber-800 font-bold">₹{item.amountLakhs.toFixed(2)} L</span>
                      </div>
                      <div className="font-semibold text-foreground truncate">{item.vendorOrRecipient}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.projectName}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedRequest && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground font-heading">{selectedRequest.vendorOrRecipient}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono">{selectedRequest.requestNumber} — {selectedRequest.requestDate}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                      {selectedRequest.reason}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-card p-3 rounded border border-border text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Cost Center & Site</span>
                      <span className="font-semibold text-foreground">{selectedRequest.costCenter}</span>
                      <span className="text-[10px] text-muted-foreground block">{selectedRequest.projectName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Requested By</span>
                      <span className="font-semibold text-foreground">{selectedRequest.requestedBy}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border border-border rounded p-3 bg-card">
                    <div className="text-xs font-semibold text-foreground">Disbursement Valuation Summary</div>
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Authorized Officer</span>
                        <span className="font-semibold text-foreground">{selectedRequest.authorizingOfficer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Attached Document Reference</span>
                        <span className="font-mono text-primary font-medium">{selectedRequest.documentRef}</span>
                      </div>
                      <div className="border-t border-border pt-1.5 flex justify-between items-center font-bold">
                        <span>Total Requested Disbursement</span>
                        <span className="font-mono text-amber-800 text-base font-extrabold">₹{selectedRequest.amountLakhs.toFixed(2)} Lakhs</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => setIsRejectModalOpen(true)}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Reject Disbursement
                    </Button>

                    <Button
                      size="sm"
                      className="flex-1 h-9 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                      onClick={handleAuthorize}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Executing...
                        </span>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Authorize & Release
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <SheetFooter className="border-t border-border pt-3">
            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={onClose}>
              Close CFO Approval Drawer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold font-heading">
              Reject Financial Disbursement Request
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide formal audit reasons for withholding disbursement and releasing encumbered cost center funds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Textarea
              placeholder="e.g. Milestone completion certificate pending independent structural verification by site engineer."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px] text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setIsRejectModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" className="text-xs h-8" onClick={handleConfirmReject} disabled={isProcessing}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
