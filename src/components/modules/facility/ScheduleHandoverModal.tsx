"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, KeyRound } from "lucide-react";
import { facilityApi, ScheduleHandoverPayload, UnitHandover } from "@/services/facilityApi";

interface AvailableUnit {
  id: string;
  unitNumber: string;
  projectName: string;
  towerName: string;
}

interface ScheduleHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHandoverScheduled: (newHandover: UnitHandover) => void;
}

export function ScheduleHandoverModal({
  isOpen,
  onClose,
  onHandoverScheduled,
}: ScheduleHandoverModalProps) {
  const [availableUnits, setAvailableUnits] = useState<AvailableUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [unitName, setUnitName] = useState<string>("");
  const [buyerName, setBuyerName] = useState<string>("");
  const [targetHandoverDate, setTargetHandoverDate] = useState<string>("");
  const [desnaggingCompletionPct, setDesnaggingCompletionPct] = useState<number | "">(100);
  const [outstandingBalance, setOutstandingBalance] = useState<number | "">(0);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setUnitName("");
      setBuyerName("");
      setSelectedUnitId("");
      setDesnaggingCompletionPct(100);
      setOutstandingBalance(0);

      // Default date to 14 days in future
      const defaultDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setTargetHandoverDate(defaultDate);

      // Fetch master units
      fetch("/api/v1/units")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setAvailableUnits(data.data);
          }
        })
        .catch(() => {
          setAvailableUnits([]);
        });
    }
  }, [isOpen]);

  const handleUnitSelect = (unitId: string) => {
    setSelectedUnitId(unitId);
    const u = availableUnits.find((item) => item.id === unitId);
    if (u) {
      setUnitName(`${u.projectName} - Tower ${u.towerName} - Unit ${u.unitNumber}`);
    }
  };

  const balanceVal = typeof outstandingBalance === "number" ? outstandingBalance : 0;
  const desnagVal = typeof desnaggingCompletionPct === "number" ? desnaggingCompletionPct : 0;
  const requiresHitl = balanceVal > 0 || desnagVal < 100;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!unitName.trim()) throw new Error("Please specify the property unit.");
      if (!buyerName.trim()) throw new Error("Please enter buyer full name.");
      if (!targetHandoverDate) throw new Error("Please select target handover date.");

      const payload: ScheduleHandoverPayload = {
        unitName: unitName.trim(),
        buyerName: buyerName.trim(),
        targetHandoverDate,
        desnaggingCompletionPct: Math.max(0, Math.min(100, desnagVal)),
        outstandingBalance: Math.max(0, balanceVal),
      };

      const created = await facilityApi.scheduleHandover(payload);
      onHandoverScheduled(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unit possession inspection could not be saved");
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
              POSSESSION DE-SNAGGING AUDIT
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              FINANCIAL NOC VERIFICATION
            </span>
          </div>
          <DialogTitle className="text-base font-bold font-heading flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Schedule Possession Inspection
          </DialogTitle>
          <DialogDescription className="sr-only">
            Verify punch-list de-snagging completion and financial NOC clearance before issuing unit keys.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error}
            </div>
          )}

          {availableUnits.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Registered Development Unit</Label>
              <Select value={selectedUnitId} onValueChange={(val) => val && handleUnitSelect(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose a registered inventory unit (optional)" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {availableUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.projectName} • {u.towerName} • Unit {u.unitNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Property Development Unit Description *</Label>
              <Input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="e.g. Avenue Horizon - Unit 402"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Buyer Full Name *</Label>
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. Rajesh Patil"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">De-Snagging Completion (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={desnaggingCompletionPct}
                onChange={(e) => setDesnaggingCompletionPct(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-muted-foreground">
                Punch-list items resolved by site engineering
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Outstanding Finance Dues (₹)</Label>
              <Input
                type="number"
                min="0"
                value={outstandingBalance}
                onChange={(e) => setOutstandingBalance(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-muted-foreground">
                Set to 0 if financial NOC is cleared in full
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Target Handover Date</Label>
            <Input
              type="date"
              value={targetHandoverDate}
              onChange={(e) => setTargetHandoverDate(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>

          {requiresHitl && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold block mb-0.5">Director Governance Escalation</span>
                Unit possession handovers with outstanding finance balances or incomplete punch items mandate Operations Director authorization before physical key release.
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
            disabled={isSubmitting || !unitName || !buyerName}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Scheduling...
              </span>
            ) : requiresHitl ? (
              "Submit for Director Sign-Off"
            ) : (
              "Schedule Possession Handover"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
