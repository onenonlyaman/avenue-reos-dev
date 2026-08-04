"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { procurementApi, PurchaseOrder } from "@/services/procurementApi";

interface ProcurementApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderProcessed: () => void;
}

export function ProcurementApprovalDrawer({
  isOpen,
  onClose,
  onOrderProcessed,
}: ProcurementApprovalDrawerProps) {
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<PurchaseOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const loadPending = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await procurementApi.getPendingApprovals();
      setPendingOrders(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pending procurement approvals could not be loaded");
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
      await procurementApi.authorizePurchaseOrder(id);
      loadPending();
      onOrderProcessed();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Purchase order could not be authorized");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrder) return;
    try {
      setProcessingId(rejectingOrder.id);
      await procurementApi.rejectPurchaseOrder(rejectingOrder.id, rejectionReason);
      setRejectingOrder(null);
      setRejectionReason("");
      loadPending();
      onOrderProcessed();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Purchase order could not be rejected");
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
                PROCUREMENT DIRECTOR GOVERNANCE
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                HIGH-VALUE PO SIGN-OFF
              </span>
            </div>
            <SheetTitle className="text-base font-bold font-heading flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-700" />
              Director Purchase Approval Queue
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Review and authorize purchase orders exceeding ₹15 Lakhs or containing unit rates above master threshold limits.
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
                Loading pending purchase authorizations...
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-foreground">No Pending Purchase Approvals</h4>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((o) => (
                  <div key={o.id} className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-foreground block">
                          {o.orderReference}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {o.siteName} • {o.vendorName}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                        High Value (&gt; ₹15L)
                      </Badge>
                    </div>

                    <div className="bg-muted/30 p-3 rounded border border-border space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Material Item</span>
                        <span className="font-semibold text-foreground">{o.materialDescription}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quantity & Agreed Rate</span>
                        <span className="font-semibold text-foreground">{o.quantity} Units @ ₹{o.unitRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Freight & Statutory GST (18%)</span>
                        <span className="font-semibold text-foreground">₹{(o.freightAmount + o.gstAmount).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="border-t border-border pt-1 flex justify-between font-bold text-xs text-foreground">
                        <span>Total PO Valuation</span>
                        <span className="text-primary text-sm font-extrabold">₹{o.orderValueLakhs.toFixed(2)} Lakhs</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-8 text-xs font-medium flex-1 bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                        onClick={() => handleAuthorize(o.id)}
                        disabled={processingId === o.id}
                      >
                        {processingId === o.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Authorize & Issue Order
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 gap-1.5"
                        onClick={() => setRejectingOrder(o)}
                        disabled={processingId === o.id}
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

      <Dialog open={!!rejectingOrder} onOpenChange={(open) => !open && setRejectingOrder(null)}>
        <DialogContent className="sm:max-w-md w-full p-6 bg-card text-card-foreground">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold font-heading text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-700" />
              Reject Purchase Order Request
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide formal audit reason for rejecting purchase order {rejectingOrder?.orderReference}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2 text-xs">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Unit rate exceeds approved master vendor rate list. Renegotiate terms with supplier."
              className="text-xs min-h-[90px]"
            />
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRejectingOrder(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-medium bg-rose-700 hover:bg-rose-800 text-white"
              onClick={handleConfirmReject}
              disabled={!rejectionReason || processingId === rejectingOrder?.id}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
