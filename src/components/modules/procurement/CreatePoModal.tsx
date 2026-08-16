"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, ShoppingCart } from "lucide-react";
import { procurementApi, CreatePoPayload, PurchaseOrder, VendorPerformance } from "@/services/procurementApi";
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
  const [siteName, setSiteName] = useState<string>("");
  const [vendorName, setVendorName] = useState<string>("");
  const [materialDescription, setMaterialDescription] = useState<string>("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [unitRate, setUnitRate] = useState<number | "">("");
  const [freightAmount, setFreightAmount] = useState<number | "">(0);
  const [deliveryDueDate, setDeliveryDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const [vendorList, setVendorList] = useState<VendorPerformance[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      procurementApi.getVendors().then((vendors) => {
        setVendorList(vendors);
      }).catch(() => {});
    }
  }, [isOpen]);

  const qtyVal = typeof quantity === "number" ? Math.max(0, quantity) : 0;
  const rateVal = typeof unitRate === "number" ? Math.max(0, unitRate) : 0;
  const freightVal = typeof freightAmount === "number" ? Math.max(0, freightAmount) : 0;

  const baseVal = qtyVal * rateVal + freightVal;
  const gstVal = Math.round(baseVal * 0.18 * 100) / 100;
  const totalVal = Math.round((baseVal + gstVal) * 100) / 100;
  const totalLakhs = (totalVal / 100000).toFixed(2);

  const requiresHitl = totalVal > HITL_PROCUREMENT_LIMIT;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!siteName.trim()) throw new Error("Please specify the target delivery site warehouse.");
      if (!vendorName.trim()) throw new Error("Please select or enter the material vendor name.");
      if (!materialDescription.trim()) throw new Error("Please enter material description and specifications.");
      if (!quantity || quantity <= 0) throw new Error("Please enter a valid order quantity greater than 0.");
      if (!unitRate || unitRate <= 0) throw new Error("Please enter a valid agreed unit rate greater than 0.");

      const payload: CreatePoPayload = {
        siteName: siteName.trim(),
        vendorName: vendorName.trim(),
        materialDescription: materialDescription.trim(),
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
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Target Delivery Site Warehouse</Label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Central Horizon Warehouse"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Approved Vendor Name</Label>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. UltraTech Cement / Tata Steel"
                list="vendor-options-list"
                className="h-8 text-xs"
              />
              <datalist id="vendor-options-list">
                {vendorList.map((v) => (
                  <option key={v.id} value={v.companyName}>
                    {v.specialty}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Material Description & Specification</Label>
            <Input
              value={materialDescription}
              onChange={(e) => setMaterialDescription(e.target.value)}
              placeholder="e.g. OPC 53 Grade Cement Bags / Fe 550 TMT Bars"
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
                placeholder="Qty"
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
                placeholder="Rate per unit"
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
                placeholder="0"
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
              PO Valuation & Statutory Tax Breakdown
            </div>
            <div className="space-y-1 pt-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material Base Valuation</span>
                <span className="font-semibold text-foreground">₹{(qtyVal * rateVal).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Freight & Logistics Charges</span>
                <span className="font-semibold text-foreground">₹{freightVal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-semibold">
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
