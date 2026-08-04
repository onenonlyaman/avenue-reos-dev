"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, ShoppingCart } from "lucide-react";
import { procurementApi, CreatePoPayload, PurchaseOrder } from "@/services/procurementApi";
import { HITL_PROCUREMENT_LIMIT } from "@/lib/governance";

interface CreatePoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (newOrder: PurchaseOrder) => void;
}

export function CreatePoModal({
  isOpen,
  onClose,
  onOrderCreated,
}: CreatePoModalProps) {
  const [siteName, setSiteName] = useState<string>("Avenue Horizon Site Warehouse");
  const [vendorName, setVendorName] = useState<string>("UltraTech Cement - Nashik Depot");
  const [materialDescription, setMaterialDescription] = useState<string>("OPC 53 Grade Cement Bags");
  const [quantity, setQuantity] = useState<number | "">(500);
  const [unitRate, setUnitRate] = useState<number | "">(380);
  const [freightAmount, setFreightAmount] = useState<number | "">(12000);
  const [deliveryDueDate, setDeliveryDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const qtyVal = typeof quantity === "number" ? quantity : 0;
  const rateVal = typeof unitRate === "number" ? unitRate : 0;
  const freightVal = typeof freightAmount === "number" ? freightAmount : 0;

  const baseVal = qtyVal * rateVal + freightVal;
  const gstVal = baseVal * 0.18;
  const totalVal = baseVal + gstVal;
  const totalLakhs = (totalVal / 100000).toFixed(2);

  const requiresHitl = totalVal > HITL_PROCUREMENT_LIMIT;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!siteName) throw new Error("Select a delivery site warehouse.");
      if (!vendorName) throw new Error("Select a material vendor.");
      if (!materialDescription) throw new Error("Enter material description.");
      if (!quantity || quantity <= 0) throw new Error("Enter valid order quantity.");
      if (!unitRate || unitRate <= 0) throw new Error("Enter valid agreed unit rate.");

      const payload: CreatePoPayload = {
        siteName,
        vendorName,
        materialDescription,
        quantity: qtyVal,
        unitRate: rateVal,
        freightAmount: freightVal,
        deliveryDueDate,
      };

      const created = await procurementApi.createPurchaseOrder(payload);
      onOrderCreated(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Purchase order could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl w-full p-6 bg-card text-card-foreground">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono">
              MATERIAL PURCHASE REQUISITION
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              18% GST & LOGISTICS AUDIT
            </span>
          </div>
          <DialogTitle className="text-base font-bold font-heading flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Draft Purchase Order
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Calculate order valuation, freight charges, and statutory GST before issuing order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Target Delivery Site Warehouse</Label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Avenue Horizon Site Warehouse"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Approved Vendor Name</Label>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. UltraTech Cement - Nashik Depot"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Material Description & Specification</Label>
            <Input
              value={materialDescription}
              onChange={(e) => setMaterialDescription(e.target.value)}
              placeholder="e.g. OPC 53 Grade Cement Bags"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Order Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Agreed Unit Rate (₹)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={unitRate}
                onChange={(e) => setUnitRate(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Freight & Logistics (₹)</Label>
              <Input
                type="number"
                min="0"
                step="100"
                value={freightAmount}
                onChange={(e) => setFreightAmount(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Expected Delivery Due Date</Label>
            <Input
              type="date"
              value={deliveryDueDate}
              onChange={(e) => setDeliveryDueDate(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="space-y-2 border border-border rounded-lg p-3 bg-card text-xs">
            <div className="font-semibold text-foreground border-b border-border pb-1">
              PO Valuation & Tax Breakdown
            </div>
            <div className="space-y-1 pt-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material Base Valuation</span>
                <span className="font-semibold text-foreground">₹{(qtyVal * rateVal).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Freight & Logistics</span>
                <span className="font-semibold text-foreground">₹{freightVal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Statutory GST (18%)</span>
                <span>+ ₹{gstVal.toLocaleString("en-IN")}</span>
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between font-bold text-xs text-foreground">
                <span>Total PO Valuation</span>
                <span className="text-primary text-sm font-extrabold">₹{totalLakhs} Lakhs</span>
              </div>
            </div>
          </div>

          {requiresHitl && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold block mb-0.5">High-Value Purchase Order Warning</span>
                Purchase orders exceeding ₹15 Lakhs mandate Procurement Director authorization before being issued to the vendor.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-3 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={`h-8 text-xs font-medium ${requiresHitl ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Submitting Order...
              </span>
            ) : requiresHitl ? (
              "Submit for Director Sign-Off"
            ) : (
              "Issue Purchase Order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

