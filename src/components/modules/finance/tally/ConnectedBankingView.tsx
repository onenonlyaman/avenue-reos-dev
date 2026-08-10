"use client";

import React, { useState, useEffect, useRef } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Landmark, CheckCircle2, UploadCloud, Coins, ShieldAlert } from "lucide-react";
import { tallyErpApi, BankBrsResponse } from "@/services/tallyErpApi";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function ConnectedBankingView() {
  const [brsData, setBrsData] = useState<BankBrsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [denom2000, setDenom2000] = useState<number>(0);
  const [denom500, setDenom500] = useState<number>(0);
  const [denom200, setDenom200] = useState<number>(0);
  const [denom100, setDenom100] = useState<number>(0);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await tallyErpApi.fetchBankingBrs();
      setBrsData(res);
    } catch (err: unknown) {
      setBrsData(null);
      setLoadError(err instanceof Error ? err.message : "Records could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploadSummary(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("That file is larger than the 5 MB limit.");
      return;
    }

    setIsUploading(true);
    try {
      const rawData = await file.text();
      const result = await tallyErpApi.uploadBankStatement({ filename: file.name, rawData });
      setUploadSummary(
        `${result.importedCount} transaction(s) imported` +
          (result.rejectedCount > 0 ? `, ${result.rejectedCount} line(s) rejected` : "") +
          ". Imported lines are unreconciled until matched."
      );
      await loadData();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "The statement could not be imported");
    } finally {
      setIsUploading(false);
    }
  };

  const countedPettyCash = denom2000 * 2000 + denom500 * 500 + denom200 * 200 + denom100 * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Imported Statement Net"
          value={`₹${(brsData?.importedNetAmount ?? 0).toLocaleString("en-IN")}`}
          subtext="Credits less debits across imported statements"
          icon={Landmark}
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Reconciled Value"
          value={`₹${(brsData?.reconciledAmount ?? 0).toLocaleString("en-IN")}`}
          subtext="Lines marked reconciled"
          icon={CheckCircle2}
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Unreconciled Items"
          value={String(brsData?.unreconciledChequesCount ?? 0)}
          subtext="Awaiting manual match"
          icon={ShieldAlert}
          trendDirection={brsData?.unreconciledChequesCount ? "down" : "up"}
        />
        <CorporateStatCard
          label="Petty Cash Counted"
          value={`₹${countedPettyCash.toLocaleString("en-IN")}`}
          subtext="Entered below; not persisted"
          icon={Coins}
          trendDirection="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-border shadow-xs space-y-4">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold font-heading">
              Import Bank Statement
            </CardTitle>
            <CardDescription className="text-xs">
              Delimited export with columns: date, description, reference, amount, type
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {uploadError && (
              <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
                {uploadError}
              </div>
            )}
            {uploadSummary && (
              <div className="p-3 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 rounded">
                {uploadSummary}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleFileSelected}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full h-8 text-xs font-semibold gap-2"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {isUploading ? "Importing statement..." : "Choose statement file"}
            </Button>
          </CardContent>

          <CardHeader className="pb-3 border-b border-t border-border">
            <CardTitle className="text-base font-semibold font-heading">
              Petty Cash Denomination Count
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "₹2000 Notes", value: denom2000, set: setDenom2000 },
                { label: "₹500 Notes", value: denom500, set: setDenom500 },
                { label: "₹200 Notes", value: denom200, set: setDenom200 },
                { label: "₹100 Notes", value: denom100, set: setDenom100 },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded"
                >
                  <span>{row.label}:</span>
                  <Input
                    type="number"
                    min={0}
                    value={row.value}
                    onChange={(e) => row.set(Math.max(0, Number(e.target.value) || 0))}
                    className="w-16 h-6 text-xs text-right font-mono"
                  />
                </div>
              ))}
            </div>
            <div className="p-2 bg-card border border-border rounded flex justify-between items-center text-xs font-bold font-heading">
              <span>Counted Total:</span>
              <span className="font-mono">₹{countedPettyCash.toLocaleString("en-IN")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold font-heading">
              Bank Reconciliation Register
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading records...</div>
            ) : loadError ? (
              <CorporateEmptyState
                title="Records could not be loaded"
                description={loadError}
                actionLabel="Retry"
                onAction={loadData}
                icon={ShieldAlert}
              />
            ) : !brsData?.brsItems || brsData.brsItems.length === 0 ? (
              <CorporateEmptyState
                title="No statement lines on record"
                description="Import a bank statement to populate this register."
                icon={Landmark}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Description</TableHead>
                    <TableHead className="text-xs font-semibold">Reference</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Amount (INR)</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brsData.brsItems.map((item) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {item.transactionDate ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-xs truncate">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {item.referenceNumber}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-right">
                        {item.type === "DEBIT" ? "−" : ""}₹{item.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.status === "RECONCILED" ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300"
                          >
                            Reconciled
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
                          >
                            Unreconciled
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
