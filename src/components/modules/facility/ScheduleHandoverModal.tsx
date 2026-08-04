"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, KeyRound } from "lucide-react";
import { facilityApi, ScheduleHandoverPayload, UnitHandover } from "@/services/facilityApi";

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
  const [unitName, setUnitName] = useState<string>("Avenue Horizon - Unit 402");
  const [buyerName, setBuyerName] = useState<string>("Rajesh Patil");
  const [targetHandoverDate, setTargetHandoverDate] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [desnaggingCompletionPct, setDesnaggingCompletionPct] = useState<number | "">(100);
  const [outstandingBalance, setOutstandingBalance] = useState<number | "">(0);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const balanceVal = typeof outstandingBalance === "number" ? outstandingBalance : 0;
  const desnagVal = typeof desnaggingCompletionPct === "number" ? desnaggingCompletionPct : 0;

  const requiresHitl = balanceVal > 0 || desnagVal < 100;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!unitName) throw new Error("Enter property unit description.");
      if (!buyerName) throw new Error("Enter buyer full name.");

      const payload: ScheduleHandoverPayload = {
        unitName,
        buyerName,
        targetHandoverDate,
        desnaggingCompletionPct: desnagVal,
        outstandingBalance: balanceVal,
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Property Development Unit</Label>
              <Input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="e.g. Avenue Horizon - Unit 402"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Buyer Full Name</Label>
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
                onChange={(e) => setDesnaggingCompletionPct(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Outstanding Finance Dues (₹)</Label>
              <Input
                type="number"
                min="0"
                value={outstandingBalance}
                onChange={(e) => setOutstandingBalance(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
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
                <span className="font-semibold block mb-0.5">Outstanding Financial Dues Warning</span>
                Unit possession handovers with outstanding finance balances or incomplete punch items mandate Facility Director authorization before key release.
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
