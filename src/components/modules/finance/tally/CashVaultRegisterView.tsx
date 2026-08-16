"use client";

import React, { useState, useEffect } from "react";
import { tallyErpApi, CashVaultResponse } from "@/services/tallyErpApi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { toast } from "@/components/ui/sonner";
import { Vault, AlertTriangle, CheckCircle2, Lock, History, Calculator } from "lucide-react";

export function CashVaultRegisterView() {
  const [data, setData] = useState<CashVaultResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Shift Management State
  const [isOpenShiftModal, setIsOpenShiftModal] = useState<boolean>(false);
  const [isCloseShiftModal, setIsCloseShiftModal] = useState<boolean>(false);
  const [cashierName, setCashierName] = useState<string>("");
  const [openingBalance, setOpeningBalance] = useState<string>("");

  // Denomination State
  const [notes500, setNotes500] = useState<string>("0");
  const [notes200, setNotes200] = useState<string>("0");
  const [notes100, setNotes100] = useState<string>("0");
  const [notes50, setNotes50] = useState<string>("0");
  const [notes20, setNotes20] = useState<string>("0");
  const [notes10, setNotes10] = useState<string>("0");
  const [coinsTotal, setCoinsTotal] = useState<string>("0");
  const [shiftRemarks, setShiftRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadVaultData = async () => {
    setIsLoading(true);
    try {
      const res = await tallyErpApi.fetchCashVault();
      setData(res);
      if (res.activeSession) {
        setNotes500(String(res.activeSession.notes500 || 0));
        setNotes200(String(res.activeSession.notes200 || 0));
        setNotes100(String(res.activeSession.notes100 || 0));
        setNotes50(String(res.activeSession.notes50 || 0));
        setNotes20(String(res.activeSession.notes20 || 0));
        setNotes10(String(res.activeSession.notes10 || 0));
        setCoinsTotal(String(res.activeSession.coinsTotal || 0));
      }
    } catch (err: any) {
      toast({ title: "Failed to load Cash Vault data", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVaultData();
  }, []);

  // Calculate live denomination sum
  const n500 = parseInt(notes500, 10) || 0;
  const n200 = parseInt(notes200, 10) || 0;
  const n100 = parseInt(notes100, 10) || 0;
  const n50 = parseInt(notes50, 10) || 0;
  const n20 = parseInt(notes20, 10) || 0;
  const n10 = parseInt(notes10, 10) || 0;
  const coins = parseFloat(coinsTotal) || 0;

  const countedTotal = n500 * 500 + n200 * 200 + n100 * 100 + n50 * 50 + n20 * 20 + n10 * 10 + coins;
  const expectedTotal = data?.systemExpectedCash || 0;
  const variance = Math.round((countedTotal - expectedTotal) * 100) / 100;
  const hasDiscrepancy = Math.abs(variance) > 0.01;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await tallyErpApi.openCashVaultSession(cashierName, parseFloat(openingBalance) || 0);
      toast({ title: "Cashier Shift Opened", description: `Shift started for ${cashierName}.` });
      setIsOpenShiftModal(false);
      loadVaultData();
    } catch (err: any) {
      toast({ title: "Opening Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.activeSession) return;
    setIsSubmitting(true);
    try {
      const res = await tallyErpApi.closeCashVaultSession({
        sessionId: data.activeSession.id,
        counts: {
          notes500: n500,
          notes200: n200,
          notes100: n100,
          notes50: n50,
          notes20: n20,
          notes10: n10,
          coinsTotal: coins,
        },
        systemExpectedBalance: expectedTotal,
        remarks: shiftRemarks,
      });
      toast({
        title: "Cashier Shift Closed",
        description: res.message,
        variant: res.calculation?.isDiscrepancy ? "destructive" : "default",
      });
      setIsCloseShiftModal(false);
      loadVaultData();
    } catch (err: any) {
      toast({ title: "Closure Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
        Loading Cash Vault and Physical Note Registers...
      </div>
    );
  }

  const activeSession = data?.activeSession;
  const history = data?.history || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-800 uppercase flex items-center justify-between">
              <span>Expected Vault Balance (Ledger)</span>
              <Vault className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-foreground">
              ₹{expectedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">System 0 Cash Ledgers Closing Balance</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Physical Note Counter Total</span>
              <Calculator className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-primary">
              ₹{countedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sum of live counted notes and coins</p>
          </CardContent>
        </Card>

        <Card
          className={
            hasDiscrepancy
              ? "border-rose-500/40 bg-rose-500/5"
              : "border-emerald-500/30 bg-emerald-500/5"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle
              className={`text-xs font-semibold uppercase flex items-center justify-between ${
                hasDiscrepancy ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              <span>Shift Reconciliation Status</span>
              {hasDiscrepancy ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-mono font-bold ${
                hasDiscrepancy ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {variance === 0
                ? "Zero Variance (Exact)"
                : variance > 0
                ? `+₹${variance.toLocaleString("en-IN")} Excess`
                : `-₹${Math.abs(variance).toLocaleString("en-IN")} Shortfall`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasDiscrepancy
                ? "Discrepancy detected between counted notes and ledger"
                : "Physical cash matches general ledger exactly"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Counting Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Physical Currency Denomination Counter</CardTitle>
              <CardDescription>
                Live count of physical notes (₹500, ₹200, ₹100, ₹50, ₹20, ₹10) and coins in the vault
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {activeSession ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setIsCloseShiftModal(true)}
                  className="w-full sm:w-auto min-h-[40px] sm:min-h-[32px] gap-1.5 font-bold"
                >
                  <Lock className="h-3.5 w-3.5" /> Close Shift
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsOpenShiftModal(true)}
                  className="w-full sm:w-auto min-h-[40px] sm:min-h-[32px] gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  <Vault className="h-3.5 w-3.5" /> Open Cashier Shift
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                    <span>₹500 Notes</span>
                    <span className="font-mono text-muted-foreground">₹{(n500 * 500).toLocaleString("en-IN")}</span>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={notes500}
                    onChange={(e) => setNotes500(e.target.value)}
                    placeholder="Count"
                    className="font-mono text-sm min-h-[40px] sm:min-h-[36px]"
                  />
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                    <span>₹200 Notes</span>
                    <span className="font-mono text-muted-foreground">₹{(n200 * 200).toLocaleString("en-IN")}</span>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={notes200}
                    onChange={(e) => setNotes200(e.target.value)}
                    placeholder="Count"
                    className="font-mono text-sm min-h-[40px] sm:min-h-[36px]"
                  />
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                    <span>₹100 Notes</span>
                    <span className="font-mono text-muted-foreground">₹{(n100 * 100).toLocaleString("en-IN")}</span>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={notes100}
                    onChange={(e) => setNotes100(e.target.value)}
                    placeholder="Count"
                    className="font-mono text-sm min-h-[40px] sm:min-h-[36px]"
                  />
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                    <span>₹50 Notes</span>
                    <span className="font-mono text-muted-foreground">₹{(n50 * 50).toLocaleString("en-IN")}</span>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={notes50}
                    onChange={(e) => setNotes50(e.target.value)}
                    placeholder="Count"
                    className="font-mono text-sm min-h-[40px] sm:min-h-[36px]"
                  />
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                    <span>₹20 Notes</span>
                    <span className="font-mono text-muted-foreground">₹{(n20 * 20).toLocaleString("en-IN")}</span>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={notes20}
                    onChange={(e) => setNotes20(e.target.value)}
                    placeholder="Count"
                    className="font-mono text-sm min-h-[40px] sm:min-h-[36px]"
                  />
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                    <span>₹10 Notes</span>
                    <span className="font-mono text-muted-foreground">₹{(n10 * 10).toLocaleString("en-IN")}</span>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={notes10}
                    onChange={(e) => setNotes10(e.target.value)}
                    placeholder="Count"
                    className="font-mono text-sm min-h-[40px] sm:min-h-[36px]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-foreground">Loose Coins Total (₹)</span>
                  <p className="text-[11px] text-muted-foreground">Combined total of ₹1, ₹2, ₹5, and ₹10 coins</p>
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={coinsTotal}
                  onChange={(e) => setCoinsTotal(e.target.value)}
                  placeholder="0.00"
                  className="font-mono text-sm w-full sm:max-w-[160px] min-h-[40px] sm:min-h-[36px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shift Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Session & Cashier</CardTitle>
            <CardDescription>Shift governance and authorization state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSession ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2.5 rounded bg-muted/30 border border-border">
                  <span className="text-xs text-muted-foreground">Session Status</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {activeSession.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded bg-muted/30 border border-border">
                  <span className="text-xs text-muted-foreground">Cashier Name</span>
                  <span className="text-xs font-bold font-mono">{activeSession.cashierName}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded bg-muted/30 border border-border">
                  <span className="text-xs text-muted-foreground">Opening Balance</span>
                  <span className="text-xs font-bold font-mono">
                    ₹{Number(activeSession.openingBalance).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded bg-muted/30 border border-border">
                  <span className="text-xs text-muted-foreground">Opened At</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {activeSession.createdAt ? new Date(activeSession.createdAt).toLocaleTimeString() : "N/A"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center border border-dashed rounded-lg space-y-2">
                <Vault className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-xs font-medium text-muted-foreground">No active cashier shift is open.</p>
                <Button
                  size="sm"
                  onClick={() => setIsOpenShiftModal(true)}
                  className="w-full sm:w-auto min-h-[40px] sm:min-h-[32px] bg-amber-600 text-white font-bold"
                >
                  Open Shift Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historical Shift Sessions Table with Horizontal Scroll Wrap */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span>Historical Cash Vault Shift Sessions</span>
            </CardTitle>
            <CardDescription>Audited cashier shifts, counted notes, and recorded variances</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {history.length === 0 ? (
            <div className="p-6">
              <CorporateEmptyState
                icon={Vault}
                title="No Shift History Recorded"
                description="Past cashier shift opening and closing sessions will appear here once recorded."
                actionLabel="Open First Shift"
                onAction={() => setIsOpenShiftModal(true)}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Opening Balance</TableHead>
                  <TableHead>Physical Counted</TableHead>
                  <TableHead>Expected Balance</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-medium">{s.date}</TableCell>
                    <TableCell className="text-xs font-semibold">{s.cashierName}</TableCell>
                    <TableCell className="font-mono text-xs">₹{s.openingBalance.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      ₹{s.physicalCountedTotal.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      ₹{s.systemExpectedTotal.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <span
                        className={
                          s.varianceAmount === 0
                            ? "text-emerald-600 font-bold"
                            : "text-rose-600 font-bold"
                        }
                      >
                        {s.varianceAmount === 0
                          ? "₹0.00"
                          : `₹${s.varianceAmount.toLocaleString("en-IN")}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.status === "CLOSED" ? "default" : "outline"}
                        className={
                          s.status === "DISCREPANCY_FLAGGED"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]"
                            : s.status === "OPEN"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Open Shift Modal */}
      <Dialog open={isOpenShiftModal} onOpenChange={setIsOpenShiftModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Cashier Shift Session</DialogTitle>
            <DialogDescription>
              Assign the active cashier and record opening float balance in the cash vault.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOpenShift} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Cashier Name / Operator ID</label>
              <Input
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder="e.g. Head Cashier"
                className="min-h-[40px] sm:min-h-[36px]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Opening Float Amount (₹)</label>
              <Input
                type="number"
                inputMode="decimal"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="min-h-[40px] sm:min-h-[36px]"
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full min-h-[44px] sm:min-h-[36px] bg-amber-600 text-white font-bold">
              {isSubmitting ? "Opening..." : "Confirm & Open Cashier Shift"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Shift Modal */}
      <Dialog open={isCloseShiftModal} onOpenChange={setIsCloseShiftModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Cashier Shift & Reconcile</DialogTitle>
            <DialogDescription>
              Confirm physical counted note total and record final shift variance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseShift} className="space-y-4 pt-2">
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Counted Notes Total:</span>
                <span className="font-mono text-primary font-bold">
                  ₹{countedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span>Expected General Ledger:</span>
                <span className="font-mono">₹{expectedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-border">
                <span>Reconciliation Variance:</span>
                <span className={hasDiscrepancy ? "text-rose-600 font-mono" : "text-emerald-600 font-mono"}>
                  ₹{variance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Closing Remarks / Discrepancy Note</label>
              <Input
                value={shiftRemarks}
                onChange={(e) => setShiftRemarks(e.target.value)}
                placeholder="Enter shift handover remarks..."
                className="min-h-[40px] sm:min-h-[36px]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full min-h-[44px] sm:min-h-[36px] font-bold ${
                hasDiscrepancy ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isSubmitting ? "Closing..." : "Sign-Off & Close Shift Session"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
