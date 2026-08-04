"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { legalApi, LandParcel } from "@/services/legalApi";

interface LegalApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onParcelProcessed: () => void;
}

export function LegalApprovalDrawer({
  isOpen,
  onClose,
  onParcelProcessed,
}: LegalApprovalDrawerProps) {
  const [pendingParcels, setPendingParcels] = useState<LandParcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingParcel, setRejectingParcel] = useState<LandParcel | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const loadPending = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await legalApi.getPendingApprovals();
      setPendingParcels(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pending legal committee approvals could not be loaded");
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
      await legalApi.authorizeAcquisition(id);
      loadPending();
      onParcelProcessed();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Land acquisition could not be authorized");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingParcel) return;
    try {
      setProcessingId(rejectingParcel.id);
      await legalApi.rejectAcquisition(rejectingParcel.id, rejectionReason);
      setRejectingParcel(null);
      setRejectionReason("");
      loadPending();
      onParcelProcessed();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Land acquisition proposal could not be rejected");
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
                LEGAL COMMITTEE GOVERNANCE
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                HIGH-VALUE PARCEL SIGN-OFF
              </span>
            </div>
            <SheetTitle className="text-base font-bold font-heading flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-700" />
              Legal & Investment Committee Queue
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Review and authorize high-value land capital outlays (&gt; ₹50 Lakhs) or parcels under title verification.
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
                Loading pending legal authorizations...
              </div>
            ) : pendingParcels.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-foreground">No Pending Legal Approvals</h4>
                <p className="text-[11px] text-muted-foreground mt-1">
                  All high-value land acquisition proposals and title clearance overrides have been reviewed by the Legal Committee.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingParcels.map((p) => (
                  <div key={p.id} className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-foreground block">
                          {p.parcelDescription}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Zone: {p.locationZone} • Ref: {p.parcelReference}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                        Requires Sign-Off
                      </Badge>
                    </div>

                    <div className="bg-muted/30 p-3 rounded border border-border space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plot Area & FSI Yield</span>
                        <span className="font-semibold text-foreground">{p.plotAreaAcres} Acres @ {p.applicableFsi} FSI ({p.constructibleSqft.toLocaleString("en-IN")} Sq. Ft.)</span>
                      </div>
                      <div className="flex justify-between text-amber-900 font-bold">
                        <span>Gross Outlay (incl. Stamp Duty)</span>
                        <span>₹{p.totalOutlayLakhs.toFixed(2)} Lakhs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Title Clearance Status</span>
                        <span className="font-semibold text-foreground">{p.titleStatus}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-8 text-xs font-medium flex-1 bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                        onClick={() => handleAuthorize(p.id)}
                        disabled={processingId === p.id}
                      >
                        {processingId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Authorize Parcel Acquisition
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 gap-1.5"
                        onClick={() => setRejectingParcel(p)}
                        disabled={processingId === p.id}
                      >
                        <XCircle className="h-3.5 w-3.5 text-rose-700" />
                        Issue Legal Rejection
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!rejectingParcel} onOpenChange={(open) => !open && setRejectingParcel(null)}>
        <DialogContent className="sm:max-w-md w-full p-6 bg-card text-card-foreground">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold font-heading text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-700" />
              Reject Land Acquisition Proposal
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide formal legal audit reason for rejecting parcel proposal {rejectingParcel?.parcelReference}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2 text-xs">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. 30-year title search revealed unresolved High Court litigation or encumbrance risk."
              className="text-xs min-h-[90px]"
            />
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRejectingParcel(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-medium bg-rose-700 hover:bg-rose-800 text-white"
              onClick={handleConfirmReject}
              disabled={!rejectionReason || processingId === rejectingParcel?.id}
            >
              Confirm Legal Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
