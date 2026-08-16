"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, Landmark } from "lucide-react";
import { legalApi, AcquireLandPayload, LandParcel } from "@/services/legalApi";

interface AcquireLandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParcelCreated: (newParcel: LandParcel) => void;
}

export function AcquireLandModal({
  isOpen,
  onClose,
  onParcelCreated,
}: AcquireLandModalProps) {
  const [parcelDescription, setParcelDescription] = useState<string>("");
  const [locationZone, setLocationZone] = useState<string>("");
  const [plotAreaAcres, setPlotAreaAcres] = useState<number | "">("");
  const [applicableFsi, setApplicableFsi] = useState<number | "">(1.5);
  const [baseLandValueAmount, setBaseLandValueAmount] = useState<number | "">("");
  const [titleStatus, setTitleStatus] = useState<"Clear Title" | "Title Under Verification" | "Litigated / Encumbered">("Clear Title");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setParcelDescription("");
      setLocationZone("");
      setPlotAreaAcres("");
      setApplicableFsi(1.5);
      setBaseLandValueAmount("");
      setTitleStatus("Clear Title");
      setError(null);
    }
  }, [isOpen]);

  const acresVal = typeof plotAreaAcres === "number" && plotAreaAcres > 0 ? plotAreaAcres : 0;
  const fsiVal = typeof applicableFsi === "number" && applicableFsi > 0 ? applicableFsi : 1.5;
  const baseVal = typeof baseLandValueAmount === "number" && baseLandValueAmount > 0 ? baseLandValueAmount : 0;

  const plotSqft = acresVal * 43560;
  const constructibleSqft = plotSqft * fsiVal;
  const stampVal = baseVal * 0.07;
  const regVal = baseVal * 0.01;
  const totalOutlay = baseVal + stampVal + regVal;
  const totalLakhs = (totalOutlay / 100000).toFixed(2);

  const requiresHitl = totalOutlay > 5000000 || titleStatus !== "Clear Title";

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const desc = parcelDescription.trim();
      const zone = locationZone.trim();

      if (!desc) throw new Error("Enter land parcel description.");
      if (!zone) throw new Error("Enter location zone.");
      if (typeof plotAreaAcres !== "number" || plotAreaAcres <= 0) {
        throw new Error("Enter a valid plot area in acres (must be greater than zero).");
      }
      if (typeof applicableFsi !== "number" || applicableFsi <= 0) {
        throw new Error("Enter a valid applicable FSI ratio.");
      }
      if (typeof baseLandValueAmount !== "number" || baseLandValueAmount <= 0) {
        throw new Error("Enter a valid base land valuation in Rupees.");
      }

      const payload: AcquireLandPayload = {
        parcelDescription: desc,
        locationZone: zone,
        plotAreaAcres: acresVal,
        applicableFsi: fsiVal,
        baseLandValueAmount: baseVal,
        titleStatus,
      };

      const created = await legalApi.acquireLand(payload);
      onParcelCreated(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Land acquisition proposal could not be saved");
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
              LAND BANKING FEASIBILITY
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              NMC FSI & STAMP DUTY AUDIT
            </span>
          </div>
          <DialogTitle className="text-base font-bold font-heading flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Record Land Acquisition Proposal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Calculate gross capital outlay, statutory stamp duty (7%), registration (1%), and NMC FSI constructible floor area yield.
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
              <Label className="text-xs font-medium">Land Parcel Description</Label>
              <Input
                value={parcelDescription}
                onChange={(e) => setParcelDescription(e.target.value)}
                placeholder="e.g. Gangapur Survey No. 104/A Parcel"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Location & Micro-Market Zone</Label>
              <Input
                value={locationZone}
                onChange={(e) => setLocationZone(e.target.value)}
                placeholder="e.g. Gangapur Road, Nashik"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Plot Area (Acres)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.01"
                placeholder="e.g. 2.5"
                value={plotAreaAcres}
                onChange={(e) => setPlotAreaAcres(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Applicable NMC FSI</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 1.8"
                value={applicableFsi}
                onChange={(e) => setApplicableFsi(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Base Land Valuation (₹)</Label>
              <Input
                type="number"
                step="100000"
                min="10000"
                placeholder="e.g. 4500000"
                value={baseLandValueAmount}
                onChange={(e) => setBaseLandValueAmount(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Initial Title Search Status</Label>
            <Select
              value={titleStatus}
              onValueChange={(val: any) => setTitleStatus(val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select Title Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Clear Title">Clear Title (30-Year Search Clean)</SelectItem>
                <SelectItem value="Title Under Verification">Title Under Verification (High Court Search)</SelectItem>
                <SelectItem value="Litigated / Encumbered">Litigated / Encumbered (Litigation Risk)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 border border-border rounded-lg p-3 bg-card text-xs">
            <div className="font-semibold text-foreground border-b border-border pb-1">
              Financial & FSI Constructible Breakdown
            </div>
            <div className="space-y-1 pt-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Constructible Area Yield</span>
                <span className="font-semibold text-foreground">{Math.round(constructibleSqft).toLocaleString("en-IN")} Sq. Ft.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statutory Stamp Duty (7%)</span>
                <span className="font-semibold text-foreground">₹{Math.round(stampVal).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration Charge (1%)</span>
                <span className="font-semibold text-foreground">₹{Math.round(regVal).toLocaleString("en-IN")}</span>
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between font-bold text-xs text-foreground">
                <span>Gross Acquisition Outlay</span>
                <span className="text-primary text-sm font-extrabold">₹{totalLakhs} Lakhs</span>
              </div>
            </div>
          </div>

          {requiresHitl && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold block mb-0.5">Legal Committee Authorization Required</span>
                Land acquisition capital outlays exceeding ₹50 Lakhs or parcels with encumbered title status mandate formal Legal Committee sign-off.
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
                Submitting Proposal...
              </span>
            ) : requiresHitl ? (
              "Submit for Legal Committee Review"
            ) : (
              "Record Land Proposal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
