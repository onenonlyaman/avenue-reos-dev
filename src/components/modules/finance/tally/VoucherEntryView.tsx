"use client";

import React, { useState, useEffect } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDownRight, ArrowUpRight, BookOpen, Plus, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { tallyErpApi, TallyVoucher, TallyLedger } from "@/services/tallyErpApi";

export function VoucherEntryView() {
  const [vouchers, setVouchers] = useState<TallyVoucher[]>([]);
  const [ledgers, setLedgers] = useState<TallyLedger[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [voucherType, setVoucherType] = useState<string>("RECEIPT");
  const [debitLedgerId, setDebitLedgerId] = useState<string>("");
  const [creditLedgerId, setCreditLedgerId] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [billReferenceType, setBillReferenceType] = useState<string>("NEW_REF");
  const [billNumber, setBillNumber] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [costCenterId, setCostCenterId] = useState<string>("CC-NASHIK-MAIN");

  const [isAddLedgerOpen, setIsAddLedgerOpen] = useState<boolean>(false);
  const [newLedgerName, setNewLedgerName] = useState<string>("");
  const [newPrimaryGroup, setNewPrimaryGroup] = useState<string>("Sundry Debtors");
  const [newSubGroup, setNewSubGroup] = useState<string>("Trade Receivables");
  const [newOpeningBal, setNewOpeningBal] = useState<string>("0");
  const [newGstin, setNewGstin] = useState<string>("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vData, lData] = await Promise.all([
        tallyErpApi.fetchVouchers(),
        tallyErpApi.fetchChartOfAccounts(),
      ]);
      setVouchers(vData);
      setLedgers(lData);
      if (lData.length >= 2) {
        setDebitLedgerId((prev) => prev || lData[0].id);
        setCreditLedgerId((prev) => prev || lData[1].id);
      }
    } catch {
      setVouchers([]);
      setLedgers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePostVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(totalAmount || 0);
    if (!numAmt || !debitLedgerId || !creditLedgerId) return;

    setIsSubmitting(true);
    try {
      await tallyErpApi.createVoucher({
        voucherType,
        debitLedgerId,
        creditLedgerId,
        totalAmount: numAmt,
        billReferenceType,
        billNumber: billNumber || `BILL-${Date.now().toString().slice(-4)}`,
        narration: narration || "Double-entry business voucher entry",
        costCenterId,
      });
      setTotalAmount("");
      setNarration("");
      setBillNumber("");
      await loadData();
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedgerName || !newPrimaryGroup) return;

    try {
      await tallyErpApi.createLedger({
        primaryGroup: newPrimaryGroup,
        subGroup: newSubGroup,
        ledgerName: newLedgerName,
        ledgerType: "BALANCE_SHEET",
        openingBalance: Number(newOpeningBal || 0),
        gstin: newGstin,
      });
      setNewLedgerName("");
      setNewOpeningBal("0");
      setNewGstin("");
      setIsAddLedgerOpen(false);
      await loadData();
    } catch {
    }
  };

  const totalDebitVolume = vouchers.reduce((acc, v) => acc + (v.status === "POSTED" ? v.totalAmount : 0), 0);
  const totalCreditVolume = totalDebitVolume;
  const pendingCount = vouchers.filter((v) => v.requiresHitl || v.status === "PENDING_APPROVAL").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Monthly Debit Volume"
          value={`₹${totalDebitVolume.toLocaleString("en-IN")}`}
          subtext="Double-entry debit ledger posting"
          icon={ArrowDownRight}
          trend="Balanced"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Monthly Credit Volume"
          value={`₹${totalCreditVolume.toLocaleString("en-IN")}`}
          subtext="Double-entry credit ledger posting"
          icon={ArrowUpRight}
          trend="Balanced"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Unreconciled Bill Ref Count"
          value={String(pendingCount)}
          subtext="High-value vouchers awaiting sign-off"
          icon={ShieldAlert}
          trend={pendingCount > 0 ? "Action Needed" : "Zero Encumbrance"}
          trendDirection={pendingCount > 0 ? "down" : "up"}
        />
        <CorporateStatCard
          label="Active Currency FX Variance"
          value="₹0.00"
          subtext="Multi-currency ledger alignment"
          icon={BookOpen}
          trend="INR Base"
          trendDirection="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold font-heading">
                  Post Double-Entry Voucher
                </CardTitle>
                <CardDescription className="text-xs">
                  Record multi-ledger journals with bill references
                </CardDescription>
              </div>
              <Dialog open={isAddLedgerOpen} onOpenChange={setIsAddLedgerOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Ledger
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-bold font-heading">
                      Create Chart of Accounts Ledger
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Add a new sub-group or party account to the enterprise hierarchy.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateLedger} className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Ledger Account Name</Label>
                      <Input
                        value={newLedgerName}
                        onChange={(e) => setNewLedgerName(e.target.value)}
                        placeholder="e.g. Gangapur Tower A Vendor Account"
                        className="text-xs h-8"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Primary Group</Label>
                        <Select value={newPrimaryGroup} onValueChange={(val) => val && setNewPrimaryGroup(val)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sundry Debtors">Sundry Debtors</SelectItem>
                            <SelectItem value="Sundry Creditors">Sundry Creditors</SelectItem>
                            <SelectItem value="Bank Accounts">Bank Accounts</SelectItem>
                            <SelectItem value="Cash-in-hand">Cash-in-hand</SelectItem>
                            <SelectItem value="Direct Expenses">Direct Expenses</SelectItem>
                            <SelectItem value="Indirect Expenses">Indirect Expenses</SelectItem>
                            <SelectItem value="Sales Accounts">Sales Accounts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Subgroup Name</Label>
                        <Input
                          value={newSubGroup}
                          onChange={(e) => setNewSubGroup(e.target.value)}
                          placeholder="Subgroup designation"
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Opening Balance (INR)</Label>
                        <Input
                          type="number"
                          value={newOpeningBal}
                          onChange={(e) => setNewOpeningBal(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">GSTIN (Optional)</Label>
                        <Input
                          value={newGstin}
                          onChange={(e) => setNewGstin(e.target.value)}
                          placeholder="27ABCDE1234F1Z5"
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsAddLedgerOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" className="h-8 text-xs font-semibold">
                        Create Ledger
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handlePostVoucher} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Voucher Type</Label>
                  <Select value={voucherType} onValueChange={(val) => val && setVoucherType(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEIPT">Receipt Voucher</SelectItem>
                      <SelectItem value="PAYMENT">Payment Voucher</SelectItem>
                      <SelectItem value="JOURNAL">Journal Voucher</SelectItem>
                      <SelectItem value="SALES">Sales Invoice</SelectItem>
                      <SelectItem value="PURCHASE">Purchase Voucher</SelectItem>
                      <SelectItem value="CONTRA">Contra Entry</SelectItem>
                      <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                      <SelectItem value="DEBIT_NOTE">Debit Note</SelectItem>
                      <SelectItem value="PHYSICAL_STOCK">Physical Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Cost Center</Label>
                  <Select value={costCenterId} onValueChange={(val) => val && setCostCenterId(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC-NASHIK-MAIN">Nashik Main Site</SelectItem>
                      <SelectItem value="CC-GANGAPUR-DEV">Gangapur Road Site</SelectItem>
                      <SelectItem value="CC-HO-ADMIN">Head Office Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Debit Ledger Account</Label>
                <Select value={debitLedgerId} onValueChange={(val) => val && setDebitLedgerId(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Debit Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {ledgers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.ledgerName} ({l.primaryGroup})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Credit Ledger Account</Label>
                <Select value={creditLedgerId} onValueChange={(val) => val && setCreditLedgerId(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Credit Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {ledgers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.ledgerName} ({l.primaryGroup})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Total Amount (INR)</Label>
                  <Input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0.00"
                    className="text-xs h-8 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Bill Reference Assignment</Label>
                  <Select value={billReferenceType} onValueChange={(val) => val && setBillReferenceType(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW_REF">New Reference</SelectItem>
                      <SelectItem value="AGST_REF">Against Reference</SelectItem>
                      <SelectItem value="ADVANCE">Advance Payment</SelectItem>
                      <SelectItem value="ON_ACCOUNT">On Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Bill Reference Number</Label>
                <Input
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="e.g. INV-2026-089"
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Voucher Narration</Label>
                <Textarea
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="Executive business justification and narration notes..."
                  className="text-xs resize-none min-h-[60px]"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-8 text-xs font-semibold mt-2"
                disabled={isSubmitting || !totalAmount}
              >
                {isSubmitting ? "Recording Voucher..." : "Commit Double-Entry Voucher"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border shadow-xs flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold font-heading">
                  Voucher Register Directory
                </CardTitle>
                <CardDescription className="text-xs">
                  Double-entry financial vouchers recorded across the platform
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {vouchers.length} Recorded
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Loading voucher register...
              </div>
            ) : vouchers.length === 0 ? (
              <CorporateEmptyState
                title="No Double-Entry Vouchers Recorded"
                description="Use the voucher entry form to post your first double-entry transaction."
                actionLabel="Post Voucher"
                onAction={() => {}}
                icon={BookOpen}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">Voucher Number</TableHead>
                      <TableHead className="text-xs font-semibold">Date</TableHead>
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold">Debit Ledger</TableHead>
                      <TableHead className="text-xs font-semibold">Credit Ledger</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Amount (INR)</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map((v) => (
                      <TableRow key={v.id} className="border-border">
                        <TableCell className="text-xs font-medium font-mono">
                          {v.voucherNumber}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {v.postingDate.split("T")[0]}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {v.voucherType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {v.debitLedgerName || "Debit Account"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {v.creditLedgerName || "Credit Account"}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold text-right">
                          ₹{v.totalAmount.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {v.requiresHitl || v.status === "PENDING_APPROVAL" ? (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                              Governance Intercept
                            </Badge>
                          ) : v.status === "CANCELLED" ? (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                              Cancelled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300">
                              Posted
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
