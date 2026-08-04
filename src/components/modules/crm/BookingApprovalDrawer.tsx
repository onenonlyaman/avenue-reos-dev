"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ShieldAlert, CheckCircle2, XCircle, UserCheck, Loader2 } from "lucide-react";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";

export interface PendingHitlBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  projectName: string;
  unitNumber: string;
  basePriceLakhs: number;
  offeredPriceLakhs: number;
  discountPercentage: number;
  discountAmountLakhs: number;
  salesRepName: string;
  salesRepNotes: string;
  submittedDate: string;
  reason: "High Discount (>5%)" | "Cancellation Waiver Request" | "Custom Payment Schedule";
}

interface BookingApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingApproved?: (id: string) => void;
}

export function BookingApprovalDrawer({
  isOpen,
  onClose,
  onBookingApproved,
}: BookingApprovalDrawerProps) {
  const [queue, setQueue] = useState<PendingHitlBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<PendingHitlBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState("");

  const loadPendingBookings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/sales/bookings/pending");
      const envelope = await res.json();
      if (envelope.success && Array.isArray(envelope.data)) {
        setQueue(envelope.data);
        if (envelope.data.length > 0) {
          setSelectedBooking(envelope.data[0]);
        } else {
          setSelectedBooking(null);
        }
      } else {
        setQueue([]);
      }
    } catch {
      setQueue([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPendingBookings();
    }
  }, [isOpen]);

  const handleApprove = async (booking: PendingHitlBooking) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/finance/approvals/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const envelope = await res.json();
      if (envelope.success) {
        setQueue((prev) => prev.filter((b) => b.id !== booking.id));
        if (onBookingApproved) {
          onBookingApproved(booking.id);
        }
        loadPendingBookings();
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedBooking) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/finance/approvals/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          notes: rejectionNotes,
        }),
      });
      const envelope = await res.json();
      if (envelope.success) {
        setQueue((prev) => prev.filter((b) => b.id !== selectedBooking.id));
        setIsRejectModalOpen(false);
        setRejectionNotes("");
        if (onBookingApproved) {
          onBookingApproved(selectedBooking.id);
        }
        loadPendingBookings();
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="sm:max-w-xl w-full p-6 flex flex-col h-full bg-card text-card-foreground">
          <SheetHeader className="pb-3 border-b border-border space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono bg-amber-50 text-amber-950 border-amber-300">
                EXECUTIVE APPROVAL CONTROL
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {queue.length} Pending Approval(s)
              </span>
            </div>
            <SheetTitle className="text-lg font-bold font-heading flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Sales Director HITL Approval Queue
            </SheetTitle>
            <SheetDescription className="sr-only">
              Review and authorize commercial exemptions, discount waivers, and high-value unit bookings.
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
                title="Sales Approval Queue Clear"
                description="There are currently no high-discount bookings or commercial exemption requests requiring Sales Director sign-off."
                icon={UserCheck}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Pending Authorization Requests
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {queue.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedBooking(item)}
                      className={`p-2.5 rounded border text-left shrink-0 w-48 transition-all ${
                        selectedBooking?.id === item.id
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                        <span className="font-bold text-foreground font-mono truncate">{item.id}</span>
                        <span className="text-amber-800 font-semibold">{item.discountPercentage}% OFF</span>
                      </div>
                      <div className="font-semibold text-foreground truncate">{item.customerName}</div>
                      <div className="text-[10px] text-muted-foreground truncate">Unit {item.unitNumber} ({item.projectName})</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedBooking && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground font-heading">{selectedBooking.customerName}</h4>
                      <p className="text-[10px] text-muted-foreground">{selectedBooking.customerPhone}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                      {selectedBooking.reason}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-card p-3 rounded border border-border text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Project & Unit</span>
                      <span className="font-semibold text-foreground">{selectedBooking.projectName} — Unit {selectedBooking.unitNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Sales Representative</span>
                      <span className="font-semibold text-foreground">{selectedBooking.salesRepName}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border border-border rounded p-3 bg-card">
                    <div className="text-xs font-semibold text-foreground">Commercial Terms Breakdown</div>
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Standard Base Price</span>
                        <span className="font-mono text-foreground">₹{selectedBooking.basePriceLakhs.toFixed(2)} Lakhs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Requested Discount ({selectedBooking.discountPercentage}%)</span>
                        <span className="font-mono text-amber-800 font-medium">-₹{selectedBooking.discountAmountLakhs.toFixed(2)} Lakhs</span>
                      </div>
                      <div className="border-t border-border pt-1.5 flex justify-between font-bold">
                        <span>Final Offered Package Price</span>
                        <span className="font-mono text-emerald-800 text-sm">₹{selectedBooking.offeredPriceLakhs.toFixed(2)} Lakhs</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 bg-card p-3 rounded border border-border">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Sales Rep Justification Notes</span>
                    <p className="text-xs text-foreground italic leading-relaxed">
                      "{selectedBooking.salesRepNotes}"
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      className="flex-1 h-9 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Reject / Request Revision
                    </Button>

                    <Button
                      size="sm"
                      disabled={isSubmitting}
                      className="flex-1 h-9 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                      onClick={() => handleApprove(selectedBooking)}
                    >
                      {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                      Approve Booking
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <SheetFooter className="border-t border-border pt-3">
            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={onClose}>
              Close Approval Drawer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold font-heading">
              Return Booking Proposal for Revision
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Specify executive instructions for sales representative regarding the requested discount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Textarea
              placeholder="e.g. Discount cannot exceed 4.5%. Offer clubhouse fee waiver instead of base price reduction."
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              className="min-h-[100px] text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" className="text-xs h-8" disabled={isSubmitting} onClick={handleConfirmReject}>
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Dispatch Revision Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
