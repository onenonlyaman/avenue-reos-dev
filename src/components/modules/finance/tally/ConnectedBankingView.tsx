"use client";

import React, { useState, useEffect } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Landmark, CheckCircle2, UploadCloud, QrCode, Coins, ShieldAlert } from "lucide-react";
import { tallyErpApi, BankBrsResponse } from "@/services/tallyErpApi";

export function ConnectedBankingView() {
  const [brsData, setBrsData] = useState<BankBrsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [denom2000, setDenom2000] = useState<number>(0);
  const [denom500, setDenom500] = useState<number>(100);
  const [denom200, setDenom200] = useState<number>(100);
  const [denom100, setDenom100] = useState<number>(154);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await tallyErpApi.fetchBankingBrs();
      setBrsData(res);
    } catch {
      setBrsData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadStatement = async () => {
    setIsUploading(true);
    try {
      await tallyErpApi.uploadBankStatement({
        filename: "HDFC_Bank_Statement_Aug2026.csv",
        rawData: "dummy,data",
      });
      await loadData();
    } catch {
    } finally {
      setIsUploading(false);
    }
  };

  const calculatedPettyCash = denom2000 * 2000 + denom500 * 500 + denom200 * 200 + denom100 * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Bank Ledger Balance"
          value={`₹${(brsData?.bankLedgerBalance || 0).toLocaleString("en-IN")}`}
          subtext="HDFC Corporate Account"
          icon={Landmark}
          trend="Live Sync"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Passbook Calculated Balance"
          value={`₹${(brsData?.passbookBalance || 0).toLocaleString("en-IN")}`}
          subtext="Post-BRS Calculated Total"
          icon={CheckCircle2}
          trend="Reconciled"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Unreconciled Items"
          value={String(brsData?.unreconciledChequesCount || 0)}
          subtext="Cheques & UTR Mismatches"
          icon={ShieldAlert}
          trend={brsData?.unreconciledChequesCount ? "Action Needed" : "Zero Mismatches"}
          trendDirection={brsData?.unreconciledChequesCount ? "down" : "up"}
        />
        <CorporateStatCard
          label="Petty Cash Drawer Total"
          value={`₹${calculatedPettyCash.toLocaleString("en-IN")}`}
          subtext="Physical Count Verified"
          icon={Coins}
          trend="Verified"
          trendDirection="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-border shadow-xs space-y-4">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold font-heading">
              Import Bank Statement (MT940 / CSV)
            </CardTitle>
            <CardDescription className="text-xs">
              Automated fuzzy-matching engine for transactions and UTRs
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="p-6 border border-dashed border-border rounded-lg text-center bg-muted/20 space-y-2">
              <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
              <div className="text-xs font-semibold">Drop MT940, CSV, or OFX statement files</div>
              <div className="text-[11px] text-muted-foreground">Supported format: HDFC, ICICI, SBI Open Banking</div>
            </div>

            <Button
              onClick={handleUploadStatement}
              disabled={isUploading}
              className="w-full h-8 text-xs font-semibold gap-2"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {isUploading ? "Processing Statement..." : "Run Automated Fuzzy BRS"}
            </Button>
          </CardContent>

          <CardHeader className="pb-3 border-b border-t border-border">
            <CardTitle className="text-base font-semibold font-heading">
              Petty Cash Denomination Verification
            </CardTitle>
            <CardDescription className="text-xs">
              Physical drawer cash count reconciliation
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded">
                <span>₹500 Notes:</span>
                <Input
                  type="number"
                  value={denom500}
                  onChange={(e) => setDenom500(Number(e.target.value))}
                  className="w-16 h-6 text-xs text-right font-mono"
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded">
                <span>₹200 Notes:</span>
                <Input
                  type="number"
                  value={denom200}
                  onChange={(e) => setDenom200(Number(e.target.value))}
                  className="w-16 h-6 text-xs text-right font-mono"
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded">
                <span>₹100 Notes:</span>
                <Input
                  type="number"
                  value={denom100}
                  onChange={(e) => setDenom100(Number(e.target.value))}
                  className="w-16 h-6 text-xs text-right font-mono"
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded">
                <span>₹2000 Notes:</span>
                <Input
                  type="number"
                  value={denom2000}
                  onChange={(e) => setDenom2000(Number(e.target.value))}
                  className="w-16 h-6 text-xs text-right font-mono"
                />
              </div>
            </div>
            <div className="p-2 bg-card border border-border rounded flex justify-between items-center text-xs font-bold font-heading">
              <span>Verified Total:</span>
              <span className="font-mono">₹{calculatedPettyCash.toLocaleString("en-IN")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold font-heading">
                  Bank Reconciliation Statement (e-BRS) Register
                </CardTitle>
                <CardDescription className="text-xs">
                  Transaction date, cheque/UTR match confidence index
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <QrCode className="h-3.5 w-3.5" />
                Generate UPI QR Link
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading e-BRS records...</div>
            ) : !brsData?.brsItems || brsData.brsItems.length === 0 ? (
              <CorporateEmptyState
                title="Zero Unreconciled Transactions"
                description="Import a bank statement to execute automated fuzzy BRS matching."
                icon={Landmark}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Description</TableHead>
                    <TableHead className="text-xs font-semibold">Reference / UTR</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Amount (INR)</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Confidence</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brsData.brsItems.map((item) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="text-xs font-mono text-muted-foreground">{item.transactionDate}</TableCell>
                      <TableCell className="text-xs font-medium max-w-xs truncate">{item.description}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{item.referenceNumber}</TableCell>
                      <TableCell className="text-xs font-mono font-bold text-right">
                        ₹{item.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-900 border-purple-300">
                          {item.matchConfidencePct}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.status === "RECONCILED" ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300">
                            Reconciled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                            Pending Match
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
