"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calculator, CheckCircle2, Plus, Trash2, Loader2 } from "lucide-react";
import { UnitDetail } from "./UnitSpecSheet";
import { LeadRecord } from "./LeadManagementView";

interface QuotationBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUnit: UnitDetail | null;
  selectedLead: LeadRecord | null;
  onBookingSubmitted: (bookingData: BookingSubmissionData) => void;
}

export interface QuotationLineItem {
  id: string;
  name: string;
  amount: number;
  category: "BASE" | "CHARGE" | "TAX";
  isRemovable: boolean;
}

export interface BookingSubmissionData {
  unitId?: string;
  unitNumber: string;
  projectName: string;
  customerName: string;
  customerPhone: string;
  discountPercentage: number;
  discountAmount: number;
  totalPackagePrice: number;
  requiresHitl: boolean;
  salesRepNotes: string;
  quotation_breakdown_json: {
    line_items: { id: string; name: string; amount: number }[];
    gross_subtotal: number;
    discount_percentage: number;
    discount_amount: number;
    discounted_subtotal: number;
    gst_rate_pct: number;
    gst_amount: number;
    final_package_price: number;
  };
}

export function QuotationBookingModal({
  isOpen,
  onClose,
  selectedUnit,
  selectedLead,
  onBookingSubmitted,
}: QuotationBookingModalProps) {
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [gstRate] = useState<number>(5);
  const [salesRepNotes, setSalesRepNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([]);
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemAmount, setNewItemAmount] = useState<string>("");

  useEffect(() => {
    if (selectedUnit) {
      const baseCost = selectedUnit.carpetAreaSqFt * selectedUnit.baseRatePerSqFt;
      const floorRise = selectedUnit.floorRisePremium || 0;

      setLineItems([
        {
          id: "base_cost",
          name: `Base Area Cost (${selectedUnit.carpetAreaSqFt} sq.ft. × ₹${selectedUnit.baseRatePerSqFt}/sq.ft.)`,
          amount: baseCost,
          category: "BASE",
          isRemovable: false,
        },
        {
          id: "floor_rise",
          name: `Floor Rise Premium (Floor ${selectedUnit.floorNumber})`,
          amount: floorRise,
          category: "BASE",
          isRemovable: true,
        },
        {
          id: "clubhouse",
          name: "Club House Membership Charge",
          amount: 250000,
          category: "CHARGE",
          isRemovable: true,
        },
        {
          id: "infrastructure",
          name: "Infrastructure & Utility Assessment",
          amount: 300000,
          category: "CHARGE",
          isRemovable: true,
        },
      ]);
    }
  }, [selectedUnit]);

  const handleUpdateItemAmount = (id: string, amount: number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: Math.max(0, amount) } : item))
    );
  };

  const handleUpdateItemName = (id: string, name: string) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCustomItem = () => {
    if (!newItemName.trim()) return;
    const amt = parseFloat(newItemAmount) || 0;
    const newItem: QuotationLineItem = {
      id: `custom_${Date.now()}`,
      name: newItemName.trim(),
      amount: amt,
      category: "CHARGE",
      isRemovable: true,
    };
    setLineItems((prev) => [...prev, newItem]);
    setNewItemName("");
    setNewItemAmount("");
  };

  const calculations = useMemo(() => {
    if (!selectedUnit) {
      return {
        grossSubtotal: 0,
        discountAmount: 0,
        discountedSubtotal: 0,
        gstAmount: 0,
        totalPackagePrice: 0,
        requiresHitl: false,
      };
    }

    const grossSubtotal = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const currentDiscountPct = Math.max(0, Math.min(100, discountPercent || 0));
    const discountAmount = Math.round((grossSubtotal * currentDiscountPct) / 100);
    const discountedSubtotal = grossSubtotal - discountAmount;

    const gstAmount = Math.round((discountedSubtotal * gstRate) / 100);
    const totalPackagePrice = discountedSubtotal + gstAmount;

    const requiresHitl = currentDiscountPct > 5;

    return {
      grossSubtotal,
      discountAmount,
      discountedSubtotal,
      gstAmount,
      totalPackagePrice,
      requiresHitl,
    };
  }, [selectedUnit, lineItems, discountPercent, gstRate]);

  if (!selectedUnit) return null;

  const handleSubmitBooking = async () => {
    const jsonBreakdown = {
      line_items: lineItems.map((item) => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
      })),
      gross_subtotal: calculations.grossSubtotal,
      discount_percentage: discountPercent,
      discount_amount: calculations.discountAmount,
      discounted_subtotal: calculations.discountedSubtotal,
      gst_rate_pct: gstRate,
      gst_amount: calculations.gstAmount,
      final_package_price: calculations.totalPackagePrice,
    };

    const submission: BookingSubmissionData = {
      unitId: selectedUnit.id,
      unitNumber: selectedUnit.unitNumber,
      projectName: selectedUnit.projectName,
      customerName: selectedLead ? selectedLead.name : "Walk-in Prospect",
      customerPhone: selectedLead ? selectedLead.phone : "+91 98000 00000",
      discountPercentage: discountPercent,
      discountAmount: calculations.discountAmount,
      totalPackagePrice: calculations.totalPackagePrice,
      requiresHitl: calculations.requiresHitl,
      salesRepNotes: salesRepNotes || "Standard commercial terms applied.",
      quotation_breakdown_json: jsonBreakdown,
    };

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/sales/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedUnit.id,
          unitNumber: selectedUnit.unitNumber,
          customerName: submission.customerName,
          customerPhone: submission.customerPhone,
          agreedTotalPrice: submission.totalPackagePrice,
          bookingDepositAmount: 200000,
          discountPercentage: discountPercent,
          quotation_breakdown_json: jsonBreakdown,
          requiresHitl: calculations.requiresHitl,
          salesRepNotes: submission.salesRepNotes,
        }),
      });

      const envelope = await res.json();
      if (envelope.success) {
        onBookingSubmitted(submission);
        setIsSubmitted(true);
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6 bg-card text-card-foreground">
        <DialogHeader className="border-b border-border pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono">
              DYNAMIC VALUATION & BOOKING ENGINE
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {selectedUnit.projectName}
            </span>
          </div>
          <DialogTitle className="text-base font-bold font-heading">
            Commercial Quotation — Unit {selectedUnit.unitNumber} ({selectedUnit.towerName})
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Prospect: {selectedLead ? selectedLead.name : "Unassigned Walk-In Prospect"}
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-300">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground font-heading">
                Booking Proposal Submitted Successfully
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {calculations.requiresHitl
                  ? "Your booking request includes a discount >5% and has been routed to the Sales Director approval queue."
                  : "Unit reserved and quotation recorded."}
              </p>
            </div>

            <Button size="sm" className="h-8 text-xs font-medium" onClick={handleCloseModal}>
              Close Valuation Window
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-xs flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg border border-border">
              <div>
                <div className="text-[10px] text-muted-foreground">Unit Typology</div>
                <div className="font-semibold text-foreground">{selectedUnit.typology || selectedUnit.unitType}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Carpet Area</div>
                <div className="font-semibold text-foreground">{selectedUnit.carpetAreaSqFt} sq. ft.</div>
              </div>
            </div>

            <div className="space-y-2 border border-border rounded-lg p-3">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between border-b border-border pb-2">
                <span>Configurable Line Item Schedule</span>
                <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
              </div>

              <div className="space-y-2 pt-1">
                {lineItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      value={item.name}
                      onChange={(e) => handleUpdateItemName(item.id, e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground font-mono">₹</span>
                      <Input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleUpdateItemAmount(item.id, parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-mono w-32 text-right"
                      />
                    </div>
                    {item.isRemovable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border flex items-center gap-2">
                <Input
                  placeholder="New Line Item Title (e.g. Car Parking Premium)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount (₹)"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  className="h-8 text-xs font-mono w-28"
                />
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleAddCustomItem}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Head
                </Button>
              </div>

              <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground">
                <span>Gross Subtotal</span>
                <span className="font-mono text-sm">₹{(calculations.grossSubtotal / 100000).toFixed(2)} Lakhs</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Commercial Discount (%)</Label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Authorized Quota: 5.0%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="25"
                  step="0.5"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-mono w-28"
                />
                <span className="text-xs text-muted-foreground">
                  = -₹{(calculations.discountAmount / 100000).toFixed(2)} Lakhs discount
                </span>
              </div>
            </div>

            {calculations.requiresHitl && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-lg flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold block mb-0.5 font-heading">Approval Warning Triggered</span>
                  Warning: Requested discount exceeds standard 5% sales quota. Submitting this booking will initiate a mandatory Human-In-The-Loop approval request to the Sales Director.
                </div>
              </div>
            )}

            <div className="bg-muted/30 border border-border p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>GST Tax (Statutory {gstRate}%)</span>
                <span className="font-mono text-foreground">₹{(calculations.gstAmount / 100000).toFixed(2)} Lakhs</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between items-center">
                <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                  Total Commercial Package Value
                </span>
                <span className="font-mono font-bold text-emerald-800 text-base">
                  ₹{(calculations.totalPackagePrice / 100000).toFixed(2)} Lakhs
                </span>
              </div>
            </div>
          </div>
        )}

        {!isSubmitted && (
          <DialogFooter className="border-t border-border pt-3 gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              className={`h-8 text-xs font-medium ${
                calculations.requiresHitl
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : ""
              }`}
              onClick={handleSubmitBooking}
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {calculations.requiresHitl ? "Submit for Executive Approval" : "Confirm Booking & Dispatch Quote"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
