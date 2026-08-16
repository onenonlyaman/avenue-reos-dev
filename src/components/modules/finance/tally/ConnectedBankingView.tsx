"use client";

import React, { useState, useEffect } from "react";
import { tallyErpApi, BankBrsResponse } from "@/services/tallyErpApi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { toast } from "@/components/ui/sonner";
import { Landmark, Upload, CheckCircle2, Download, RefreshCw, Layers } from "lucide-react";

export function ConnectedBankingView() {
  const [data, setData] = useState<BankBrsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [csvContent, setCsvContent] = useState<string>("");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [isAutoReconciling, setIsAutoReconciling] = useState<boolean>(false);

  const loadBankingData = async () => {
    setIsLoading(true);
    try {
      const res = await tallyErpApi.fetchBankingBrs();
      setData(res);
      if (res.accounts && res.accounts.length > 0 && !selectedBankId) {
        setSelectedBankId(res.accounts[0].id);
      }
    } catch (err: any) {
      toast({ title: "Failed to load Banking Reconciliation", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBankingData();
  }, []);

  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim() || !selectedBankId) {
      toast({ title: "Validation Error", description: "CSV content and bank account are required.", variant: "destructive" });
      return;
    }

    try {
      const res = await tallyErpApi.uploadBankStatementCsv(selectedBankId, "statement_feed.csv", csvContent);
      toast({ title: "Statement Uploaded", description: res.message });
      setIsUploading(false);
      setCsvContent("");
      loadBankingData();
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleAutoReconcile = async () => {
    setIsAutoReconciling(true);
    try {
      const res = await tallyErpApi.runAutoReconcile();
      toast({ title: "Reconciliation Complete", description: res.message });
      loadBankingData();
    } catch (err: any) {
      toast({ title: "Auto-Reconciliation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsAutoReconciling(false);
    }
  };

  const handleExportPayoutBatch = async () => {
    try {
      const res = await tallyErpApi.exportPayoutBatchCsv();
      const blob = new Blob([res.csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.fileName || "corporate_payout_batch.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Batch Exported", description: "Corporate NEFT/RTGS payout instruction downloaded." });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
        Loading Bank Ledgers & Statement Clearance Lines...
      </div>
    );
  }

  const accounts = data?.accounts || [];
  const statements = data?.unmatchedStatements || [];
  const bookEntries = data?.bookEntries || [];

  return (
    <div className="space-y-6">
      {/* Bank Account Balances Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <Card key={acc.id} className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                <span>{acc.bankName}</span>
                <Landmark className="h-4 w-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-mono font-bold text-foreground">
                ₹{acc.bookBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                A/c: {acc.accountNumber} ({acc.ifscCode})
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-muted/20 border border-border rounded-xl">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {statements.length} Statement Txns
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {bookEntries.length} Book Vouchers
          </Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button size="sm" variant="outline" onClick={handleExportPayoutBatch} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export Payout CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsUploading(true)} className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" /> Upload Statement
          </Button>
          <Button
            size="sm"
            onClick={handleAutoReconcile}
            disabled={isAutoReconciling}
            className="gap-1.5 text-xs font-bold bg-primary"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isAutoReconciling ? "animate-spin" : ""}`} />
            <span>3-Point Fuzzy Auto-Match</span>
          </Button>
        </div>
      </div>

      {/* Split Workspace: Statement Lines vs Book Vouchers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Statement Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Bank Statement Clearance Feed</CardTitle>
              <CardDescription>Inbound transactions parsed from MT940/CSV feeds</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {statements.length === 0 ? (
              <div className="p-6">
                <CorporateEmptyState
                  icon={Landmark}
                  title="No Statement Lines Uploaded"
                  description="Upload your bank statement CSV to run automated 3-point fuzzy reconciliation."
                  actionLabel="Upload Statement CSV"
                  onAction={() => setIsUploading(true)}
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((s) => {
                    const isDr = s.withdrawalDebit > 0;
                    const amt = isDr ? s.withdrawalDebit : s.depositCredit;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.date}</TableCell>
                        <TableCell className="font-mono text-xs font-medium">{s.reference}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate" title={s.description}>
                          {s.description}
                        </TableCell>
                        <TableCell className={`font-mono text-xs font-bold text-right ${isDr ? "text-rose-600" : "text-emerald-600"}`}>
                          {isDr ? "-" : "+"}₹{amt.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              s.status === "MATCHED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                            }
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* General Ledger Book Vouchers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">General Ledger Bank Vouchers</CardTitle>
              <CardDescription>Internal book entries awaiting statement clearance</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {bookEntries.length === 0 ? (
              <div className="p-6">
                <CorporateEmptyState
                  icon={Layers}
                  title="No Bank Entries Recorded"
                  description="Post receipts or payment vouchers linked to bank accounts to reconcile."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookEntries.map((b) => (
                    <TableRow key={b.voucherId}>
                      <TableCell className="font-mono text-xs font-semibold">{b.voucherNumber}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{b.voucherDate}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate" title={b.particulars}>
                        {b.particulars}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-right">
                        ₹{b.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {b.entryType}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Statement Dialog */}
      <Dialog open={isUploading} onOpenChange={setIsUploading}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Bank Statement (CSV/MT940)</DialogTitle>
            <DialogDescription>
              Paste CSV bank statement records with columns: Date, Description, Reference, Debit, Credit, Balance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadCsv} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Select Bank Ledger Account</label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} - A/c {a.accountNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">CSV Statement Content</label>
              <Textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={`Date,Description,Reference,Debit,Credit,Balance\n2026-08-04,UltraTech Cement Vendor,NEFT-HDFC-991,2850000,0,2150000\n2026-08-04,Plot Buyer Advance Token,IMPS-778899,0,150000,2300000`}
                className="font-mono text-xs min-h-[140px]"
                required
              />
            </div>
            <Button type="submit" className="w-full font-bold">
              Parse & Ingest Statement Transactions
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
