"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ShieldAlert, CheckCircle2, XCircle, UserCheck, Loader2 } from "lucide-react";
import { constructionApi, ContractorRaBill } from "@/services/constructionApi";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";

interface ConstructionApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBillProcessed?: () => void;
}

export function ConstructionApprovalDrawer({
  isOpen,
  onClose,
  onBillProcessed,
}: ConstructionApprovalDrawerProps) {
  const [queue, setQueue] = useState<ContractorRaBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<ContractorRaBill | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      const res = await constructionApi.getPendingApprovals();
      setQueue(res);
      if (res.length > 0) {
        setSelectedBill(res[0]);
      } else {
        setSelectedBill(null);
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
    if (!selectedBill) return;
    try {
      setIsProcessing(true);
      await constructionApi.authorizeRaBill(selectedBill.id);
      const updatedQueue = queue.filter((item) => item.id !== selectedBill.id);
      setQueue(updatedQueue);
      setSelectedBill(updatedQueue[0] || null);
      if (onBillProcessed) onBillProcessed();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "RA bill could not be authorized");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedBill) return;
    try {
      setIsProcessing(true);
      await constructionApi.rejectRaBill(selectedBill.id, rejectionReason || "Flagged for physical re-measurement by Project Director.");
      const updatedQueue = queue.filter((item) => item.id !== selectedBill.id);
      setQueue(updatedQueue);
      setSelectedBill(updatedQueue[0] || null);
      setIsRejectModalOpen(false);
      setRejectionReason("");
      if (onBillProcessed) onBillProcessed();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "RA bill could not be rejected");
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
                PROJECT DIRECTOR HITL APPROVAL CONTROL
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {queue.length} Pending Approval(s)
              </span>
            </div>
            <SheetTitle className="text-lg font-bold font-heading flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Construction RA Bill Authorization Sheet
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Authorize high-value contractor Running Account bills exceeding ₹25 Lakhs and physical progress claim variances.
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
                title="Director Approval Queue Clear"
                description="There are currently no high-value contractor RA bills or physical progress variances awaiting sign-off."
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
                      onClick={() => setSelectedBill(item)}
                      className={`p-2.5 rounded border text-left shrink-0 w-56 transition-all ${
                        selectedBill?.id === item.id
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                        <span className="font-bold text-foreground">{item.billReference}</span>
                        <span className="text-amber-800 font-bold">₹{item.grossClaimLakhs.toFixed(2)} L</span>
                      </div>
                      <div className="font-semibold text-foreground truncate">{item.contractorName}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.projectName}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedBill && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground font-heading">{selectedBill.contractorName}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono">{selectedBill.billReference} — {selectedBill.wbsPhase}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                      High-Value Claim (&gt; ₹25L)
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-card p-3 rounded border border-border text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Claimed Progress %</span>
                      <span className="font-semibold text-foreground font-mono">{selectedBill.claimedProgressPct}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Verified Progress %</span>
                      <span className="font-semibold text-emerald-700 font-mono">{selectedBill.verifiedProgressPct}%</span>
                    </div>
                  </div>

                  <div className="space-y-2 border border-border rounded p-3 bg-card">
                    <div className="text-xs font-semibold text-foreground">Reconciliation Financial Valuation</div>
                    <div className="space-y-1 pt-1 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross Claim Amount</span>
                        <span className="font-semibold text-foreground">₹{selectedBill.grossClaimLakhs.toFixed(2)} Lakhs</span>
                      </div>
                      <div className="flex justify-between text-amber-800">
                        <span>Quality Holdback Retainage (5%)</span>
                        <span>- ₹{selectedBill.retainedHoldbackLakhs.toFixed(2)} Lakhs</span>
                      </div>
                      <div className="flex justify-between text-emerald-800">
                        <span>Statutory GST (18%)</span>
                        <span>+ ₹{selectedBill.gstLakhs.toFixed(2)} Lakhs</span>
                      </div>
                      <div className="border-t border-border pt-1.5 flex justify-between items-center font-bold">
                        <span>Net Verified Payment</span>
                        <span className="font-mono text-amber-800 text-base font-extrabold">₹{selectedBill.netPayableLakhs.toFixed(2)} Lakhs</span>
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
                      Flag Audit Variance & Reject
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
                          Authorizing...
                        </span>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Authorize RA Bill Disbursement
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
              Close Director Approval Sheet
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold font-heading">
              Reject Contractor RA Bill Claim
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide formal engineering audit reasons for returning bill for site re-measurement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Textarea
              placeholder="e.g. Claimed 75% superstructure progress exceeds verified 70% physical completion in Measurement Book."
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
