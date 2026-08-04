"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Compass, Car, ShieldCheck, FileText } from "lucide-react";

export interface UnitDetail {
  id?: string;
  unitNumber: string;
  floorNumber: number;
  towerName: string;
  projectName: string;
  unitType: string;
  typology?: string;
  carpetAreaSqFt: number;
  balconyAreaSqFt: number;
  baseRatePerSqFt: number;
  basePriceLakhs: number;
  floorRisePremium: number;
  facingDirection: string;
  parkingAllocations: string;
  reraDetails?: string;
  status: "Available" | "Reserved" | "Booked" | "Blocked";
}

interface UnitSpecSheetProps {
  isOpen: boolean;
  onClose: () => void;
  unit: UnitDetail | null;
  onInitiateQuotation?: (unit: UnitDetail) => void;
}

export function UnitSpecSheet({
  isOpen,
  onClose,
  unit,
  onInitiateQuotation,
}: UnitSpecSheetProps) {
  if (!unit) return null;

  const cleanFacing = (unit.facingDirection || "East")
    .replace(/\s*\(.*?\)/g, "")
    .trim();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md w-full p-6 flex flex-col h-full bg-card text-card-foreground">
        <SheetHeader className="pb-3 border-b border-border space-y-1">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={`text-[10px] font-mono px-2 py-0.5 ${
                unit.status === "Available"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                  : unit.status === "Reserved"
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : unit.status === "Booked"
                  ? "bg-blue-50 text-blue-900 border-blue-300"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              {unit.status.toUpperCase()} INVENTORY
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              Floor {unit.floorNumber} — Unit {unit.unitNumber}
            </span>
          </div>

          <SheetTitle className="text-lg font-bold font-heading">
            {unit.unitNumber} — {unit.typology || unit.unitType}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {unit.projectName} ({unit.towerName})
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          <div className="bg-muted/40 p-4 rounded-lg border border-border flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Estimated Base Price</span>
              <span className="text-xl font-bold font-mono text-emerald-800">₹{unit.basePriceLakhs.toFixed(2)} Lakhs</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Base Rate</span>
              <span className="font-mono text-foreground font-semibold">₹{unit.baseRatePerSqFt.toLocaleString()} / sq.ft.</span>
            </div>
          </div>

          <div className="space-y-2 border border-border rounded-lg p-3 bg-card">
            <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-primary" />
              Architectural Spatial Dimensions
            </h4>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2 bg-muted/30 rounded border border-border">
                <span className="text-[10px] text-muted-foreground block">Carpet Area</span>
                <span className="font-mono font-semibold text-foreground">{unit.carpetAreaSqFt} Sq.Ft.</span>
              </div>

              <div className="p-2 bg-muted/30 rounded border border-border">
                <span className="text-[10px] text-muted-foreground block">Exclusive Balcony</span>
                <span className="font-mono font-semibold text-foreground">{unit.balconyAreaSqFt} Sq.Ft.</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border border-border rounded-lg p-3 bg-card">
            <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-primary" />
              Facing Direction & Parking Allocation
            </h4>
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Facing Orientation:</span>
                <span className="font-semibold text-foreground">{cleanFacing}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Parking Slots:</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Car className="h-3 w-3 text-muted-foreground" />
                  {unit.parkingAllocations}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Floor Rise Charge:</span>
                <span className="font-mono text-foreground font-semibold">₹{unit.floorRisePremium.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 border border-border rounded-lg p-3 bg-card">
            <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              Statutory RERA Warranty Details
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {unit.reraDetails || "Includes statutory structural warranty, fire safety compliance certification, and EV charging slot allocation."}
            </p>
          </div>
        </div>

        <SheetFooter className="border-t border-border pt-3 gap-2">
          {unit.status === "Available" && onInitiateQuotation && (
            <Button
              size="sm"
              className="w-full text-xs h-9 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
              onClick={() => onInitiateQuotation(unit)}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Generate Official Sales Quotation
            </Button>
          )}

          <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={onClose}>
            Close Specification Sheet
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
