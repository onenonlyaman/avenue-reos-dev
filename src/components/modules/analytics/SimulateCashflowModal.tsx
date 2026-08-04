"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LineChart, Loader2 } from "lucide-react";
import { analyticsApi, SimulateCashflowPayload, LiquidityEntry } from "@/services/analyticsApi";

interface SimulateCashflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulationCreated: (newEntry: LiquidityEntry) => void;
}

export function SimulateCashflowModal({
  isOpen,
  onClose,
  onSimulationCreated,
}: SimulateCashflowModalProps) {
  const [operatingPeriod, setOperatingPeriod] = useState<string>("Q4 2026 Forecast");
  const [customerInflowsLakhs, setCustomerInflowsLakhs] = useState<number | "">(1250);
  const [vendorOutflowsLakhs, setVendorOutflowsLakhs] = useState<number | "">(680);
  const [debtServiceLakhs, setDebtServiceLakhs] = useState<number | "">(280);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const inflows = typeof customerInflowsLakhs === "number" ? customerInflowsLakhs : 0;
  const outflows = typeof vendorOutflowsLakhs === "number" ? vendorOutflowsLakhs : 0;
  const debt = typeof debtServiceLakhs === "number" ? debtServiceLakhs : 1;

  const netCash = inflows - outflows;
  const dscr = debt > 0 ? Number((netCash / debt).toFixed(2)) : 2.5;

  let solvencyText = "Healthy Solvency";
  if (dscr < 1.15) solvencyText = "Liquidity Risk";
  else if (dscr < 1.5) solvencyText = "Debt Caution";

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!operatingPeriod) throw new Error("Enter operating period label.");
      if (inflows <= 0) throw new Error("Enter valid projected customer inflows.");

      const payload: SimulateCashflowPayload = {
        operatingPeriod,
        customerInflowsLakhs: inflows,
        vendorOutflowsLakhs: outflows,
        debtServiceLakhs: debt,
      };

      const created = await analyticsApi.simulateCashflow(payload);
      onSimulationCreated(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cashflow scenario simulation could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg w-full p-6 bg-card text-card-foreground">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono">
              FINANCIAL SOLVENCY MODELING
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              DSCR RATIO AUDIT
            </span>
          </div>
          <DialogTitle className="text-base font-bold font-heading flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            Simulate Cash Flow Projections
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Model projected quarterly customer inflows, vendor construction outflows, and debt service coverage ratios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Operating Forecast Period</Label>
            <Input
              value={operatingPeriod}
              onChange={(e) => setOperatingPeriod(e.target.value)}
              placeholder="e.g. Q4 2026 Forecast"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Inflows (₹ Lakhs)</Label>
              <Input
                type="number"
                min="0"
                value={customerInflowsLakhs}
                onChange={(e) => setCustomerInflowsLakhs(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold text-emerald-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Outflows (₹ Lakhs)</Label>
              <Input
                type="number"
                min="0"
                value={vendorOutflowsLakhs}
                onChange={(e) => setVendorOutflowsLakhs(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold text-rose-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Debt Service (₹ L)</Label>
              <Input
                type="number"
                min="1"
                value={debtServiceLakhs}
                onChange={(e) => setDebtServiceLakhs(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-2 border border-border rounded-lg p-3 bg-card text-xs">
            <div className="font-semibold text-foreground border-b border-border pb-1">
              Solvency & DSCR Ratio Calculation
            </div>
            <div className="space-y-1 pt-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Operating Cash Flow</span>
                <span className="font-semibold text-foreground">₹{netCash.toLocaleString("en-IN")} Lakhs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">DSCR Coverage Ratio</span>
                <span className="font-extrabold text-foreground">{dscr}x</span>
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between font-bold text-xs text-foreground">
                <span>Solvency Assessment</span>
                <span className={dscr >= 1.5 ? "text-emerald-800" : dscr >= 1.15 ? "text-amber-800" : "text-rose-800"}>
                  {solvencyText}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs font-medium" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Simulating...
              </span>
            ) : (
              "Record Cash Flow Forecast"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
