"use client";

import React, { useState, useEffect } from "react";
import { tallyErpApi, TallyVoucher, TallyLedger } from "@/services/tallyErpApi";
import { BookScope } from "@/lib/accounting/multiBookScope";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { ArrowDownRight, ArrowUpRight, BookOpen, ShieldAlert, Receipt } from "lucide-react";

interface VoucherEntryViewProps {
  bookScope?: BookScope;
}

export function VoucherEntryView({ bookScope = "STATUTORY" }: VoucherEntryViewProps) {
  const [vouchers, setVouchers] = useState<TallyVoucher[]>([]);
  const [ledgers, setLedgers] = useState<TallyLedger[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Voucher Form State
  const [voucherType, setVoucherType] = useState<string>("RECEIPT");
  const [voucherBookType, setVoucherBookType] = useState<"STATUTORY" | "INTERNAL">(
    bookScope === "INTERNAL" ? "INTERNAL" : "STATUTORY"
  );
  const [debitLedgerId, setDebitLedgerId] = useState<string>("");
  const [creditLedgerId, setCreditLedgerId] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [gstRate, setGstRate] = useState<string>("18");
  const [tdsSection, setTdsSection] = useState<string>("NONE");
  const [billReferenceType, setBillReferenceType] = useState<string>("NEW_REF");
  const [billNumber, setBillNumber] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [auditReason, setAuditReason] = useState<string>("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vData, coaRes] = await Promise.all([
        tallyErpApi.fetchVouchers(bookScope),
        tallyErpApi.fetchChartOfAccounts(bookScope),
      ]);
      setVouchers(vData || []);
      const lData = coaRes.data || [];
      setLedgers(lData);
    } catch (err: any) {
      toast({ title: "Failed to load vouchers", description: err.message, variant: "destructive" });
      setVouchers([]);
      setLedgers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setVoucherBookType(bookScope === "INTERNAL" ? "INTERNAL" : "STATUTORY");
  }, [bookScope]);

  // Contextual Smart Ledger Filtering
  const getFilteredDebitLedgers = () => {
    if (voucherType === "RECEIPT" || voucherType === "CONTRA") {
      return ledgers.filter((l) => l.groupCode === "GRP-100"); // Bank & Cash Accounts
    }
    if (voucherType === "PAYMENT") {
      return ledgers.filter((l) => l.groupCode === "GRP-300" || l.groupCode === "GRP-600" || l.groupCode === "GRP-610");
    }
    if (voucherType === "SALES") {
      return ledgers.filter((l) => l.groupCode === "GRP-200"); // Sundry Debtors
    }
    if (voucherType === "PURCHASE") {
      return ledgers.filter((l) => l.groupCode === "GRP-210" || l.groupCode === "GRP-600"); // Stock / Expense
    }
    return ledgers;
  };

  const getFilteredCreditLedgers = () => {
    if (voucherType === "RECEIPT") {
      return ledgers.filter((l) => l.groupCode === "GRP-200" || l.groupCode === "GRP-500"); // Debtors / Sales
    }
    if (voucherType === "PAYMENT" || voucherType === "CONTRA") {
      return ledgers.filter((l) => l.groupCode === "GRP-100"); // Bank & Cash
    }
    if (voucherType === "SALES") {
      return ledgers.filter((l) => l.groupCode === "GRP-500" || l.groupCode === "GRP-400"); // Sales / Duties
    }
    if (voucherType === "PURCHASE") {
      return ledgers.filter((l) => l.groupCode === "GRP-300"); // Creditors
    }
    return ledgers;
  };

  const filteredDebitOptions = getFilteredDebitLedgers();
  const filteredCreditOptions = getFilteredCreditLedgers();

  useEffect(() => {
    if (filteredDebitOptions.length > 0 && !filteredDebitOptions.some((l) => l.id === debitLedgerId)) {
      setDebitLedgerId(filteredDebitOptions[0].id);
    }
    if (filteredCreditOptions.length > 0 && !filteredCreditOptions.some((l) => l.id === creditLedgerId)) {
      setCreditLedgerId(filteredCreditOptions[0].id);
    }
  }, [voucherType, ledgers, debitLedgerId, creditLedgerId]);

  const handlePostVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(totalAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      toast({ title: "Validation Error", description: "Please specify a valid voucher amount.", variant: "destructive" });
      return;
    }
    if (!debitLedgerId || !creditLedgerId) {
      toast({ title: "Validation Error", description: "Debit and Credit ledgers are required.", variant: "destructive" });
      return;
    }
    if (!narration.trim()) {
      toast({ title: "Validation Error", description: "Voucher narration is mandatory for general ledger audit.", variant: "destructive" });
      return;
    }
    if (!auditReason.trim()) {
      toast({ title: "Validation Error", description: "MCA audit change reason is required for compliance.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await tallyErpApi.createVoucher({
        voucherType,
        bookType: voucherBookType,
        debitLedgerId,
        creditLedgerId,
        totalAmount: numAmt,
        billReferenceType,
        billNumber: billNumber.trim() || undefined,
        narration: narration.trim(),
        auditReason: auditReason.trim(),
      });

      toast({
        title: "Voucher Posted Successfully",
        description: res.requiresHitl
          ? "Voucher exceeds ₹10,00,000 threshold and is held for Executive Authorization."
          : `Recorded voucher ${res.voucherNumber || ''} with double-entry balance verified.`,
      });

      setBillNumber("");
      setTotalAmount("");
      setNarration("");
      setAuditReason("");
      loadData();
    } catch (err: any) {
      toast({ title: "Posting Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalDebitVolume = vouchers.reduce((acc, v) => acc + (v.status === "POSTED" ? Number(v.totalAmount) : 0), 0);
  const totalCreditVolume = totalDebitVolume;
  const pendingCount = vouchers.filter((v) => v.requiresHitl || v.status === "PENDING_APPROVAL").length;

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Total Debit Volume"
          value={`₹${totalDebitVolume.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Double-entry debit ledger posting"
          icon={ArrowDownRight}
          trend="Balanced"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Total Credit Volume"
          value={`₹${totalCreditVolume.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Double-entry credit ledger posting"
          icon={ArrowUpRight}
          trend="Balanced"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Pending Authorizations"
          value={String(pendingCount)}
          subtext="High-value vouchers awaiting sign-off"
          icon={ShieldAlert}
          trend={pendingCount > 0 ? "Action Required" : "Zero Encumbrance"}
          trendDirection={pendingCount > 0 ? "down" : "up"}
        />
        <CorporateStatCard
          label="Active Book Scope"
          value={bookScope}
          subtext={bookScope === "STATUTORY" ? "Official Tax Books" : "Internal Cash Chest"}
          icon={BookOpen}
          trend={bookScope}
          trendDirection="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voucher Posting Form */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Post Double-Entry Voucher</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                {voucherBookType}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Enforced Double-Entry Invariant: Sum(Dr) = Sum(Cr)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handlePostVoucher} className="space-y-4">
              {/* Voucher Type Selector */}
              <div className="grid grid-cols-3 gap-1.5">
                {["RECEIPT", "PAYMENT", "SALES", "PURCHASE", "JOURNAL", "CONTRA"].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={voucherType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVoucherType(type)}
                    className="text-[10px] font-bold h-7"
                  >
                    {type}
                  </Button>
                ))}
              </div>

              {/* Book Scope Toggle */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Book Scope Stream</label>
                <select
                  value={voucherBookType}
                  onChange={(e) => setVoucherBookType(e.target.value as "STATUTORY" | "INTERNAL")}
                  className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold"
                >
                  <option value="STATUTORY">Statutory (System 1 - Official Tax & Audit)</option>
                  <option value="INTERNAL">Internal Cash (System 0 - Vault / Deal Split)</option>
                </select>
              </div>

              {/* Smart Contextual Dr / Cr Selectors */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-primary">
                    <span>Debit Ledger Account (Dr)</span>
                    <Badge variant="outline" className="text-[9px]">{voucherType} RULE</Badge>
                  </div>
                  <select
                    value={debitLedgerId}
                    onChange={(e) => setDebitLedgerId(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs"
                    required
                  >
                    {filteredDebitOptions.length === 0 ? (
                      <option value="">No matching debit accounts</option>
                    ) : (
                      filteredDebitOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} ({opt.code}) - {opt.group}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-primary">
                    <span>Credit Ledger Account (Cr)</span>
                    <Badge variant="outline" className="text-[9px]">{voucherType} RULE</Badge>
                  </div>
                  <select
                    value={creditLedgerId}
                    onChange={(e) => setCreditLedgerId(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs"
                    required
                  >
                    {filteredCreditOptions.length === 0 ? (
                      <option value="">No matching credit accounts</option>
                    ) : (
                      filteredCreditOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} ({opt.code}) - {opt.group}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Amount & Statutory Tax */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Total Amount (₹)</label>
                  <Input
                    type="number"
                    min="1"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0.00"
                    className="font-mono text-xs h-8 font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">GST Rate</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="0">Exempt (0%)</option>
                    <option value="5">GST 5%</option>
                    <option value="12">GST 12%</option>
                    <option value="18">GST 18%</option>
                    <option value="28">GST 28%</option>
                  </select>
                </div>
              </div>

              {/* Bill Reference Assignment */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Bill Ref Type</label>
                  <select
                    value={billReferenceType}
                    onChange={(e) => setBillReferenceType(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="NEW_REF">New Ref</option>
                    <option value="AGST_REF">Against Ref</option>
                    <option value="ADVANCE">Advance</option>
                    <option value="ON_ACCOUNT">On Account</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Bill Number</label>
                  <Input
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="e.g. INV-2026-089"
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Voucher Narration</label>
                <Input
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="Audit narration details..."
                  className="text-xs h-8"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">MCA Audit Change Reason</label>
                <Input
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="Mandatory append-only reason..."
                  className="text-xs h-8"
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full font-bold h-8 text-xs">
                {isSubmitting ? "Posting..." : "Commit Double-Entry Voucher"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Voucher Register Directory */}
        <Card className="lg:col-span-2 border-border flex flex-col">
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">General Ledger Voucher Register</CardTitle>
              <CardDescription className="text-xs">
                Audited double-entry records ({bookScope} scope)
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {vouchers.length} Vouchers
            </Badge>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {vouchers.length === 0 ? (
              <div className="p-6">
                <CorporateEmptyState
                  icon={Receipt}
                  title="No Vouchers Recorded"
                  description="Use the voucher entry form to post your first double-entry transaction in this book scope."
                  actionLabel="Post Voucher"
                  onAction={() => {}}
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Debit Ledger</TableHead>
                    <TableHead>Credit Ledger</TableHead>
                    <TableHead className="text-right">Amount (INR)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs font-semibold">{v.voucherNumber}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {v.postingDate ? v.postingDate.split("T")[0] : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {v.voucherType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{v.debitLedgerName || "Debit Ledger"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{v.creditLedgerName || "Credit Ledger"}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-right">
                        ₹{Number(v.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        {v.requiresHitl || v.status === "PENDING_APPROVAL" ? (
                          <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]">
                            Approval Required
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            {v.status}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
