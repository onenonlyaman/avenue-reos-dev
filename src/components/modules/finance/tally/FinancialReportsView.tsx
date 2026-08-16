"use client";

import React, { useState, useEffect } from "react";
import { tallyErpApi, FinancialReportsResponse } from "@/services/tallyErpApi";
import { BookScope } from "@/lib/accounting/multiBookScope";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { toast } from "@/components/ui/sonner";
import { Landmark, ArrowDownRight, ArrowUpRight, Scale, Clock, TrendingUp } from "lucide-react";

interface FinancialReportsViewProps {
  bookScope?: BookScope;
}

export function FinancialReportsView({ bookScope = "STATUTORY" }: FinancialReportsViewProps) {
  const [data, setData] = useState<FinancialReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<"bs" | "pl" | "tb" | "aging">("bs");

  const loadFinancials = async () => {
    setIsLoading(true);
    try {
      const res = await tallyErpApi.fetchFinancialReports(bookScope);
      setData(res);
    } catch (err: any) {
      toast({ title: "Failed to load Financial Reports", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinancials();
  }, [bookScope]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
        Compiling Balance Sheet, P&L, Trial Balance & Aging Analysis...
      </div>
    );
  }

  const balanceSheet = data?.balanceSheet || [];
  const profitAndLoss = data?.profitAndLoss || [];
  const trialBalance = data?.trialBalance || [];
  const agingReport = data?.agingReport || [];

  const totalAssets = data?.totalAssets || 0;
  const totalLiabilities = data?.totalLiabilities || 0;
  const netWorkingCapital = data?.netWorkingCapital || 0;
  const cashRunway = data?.cashRunwayMonths !== undefined
    ? data.cashRunwayMonths
    : (totalLiabilities > 0 ? Number((totalAssets / (totalLiabilities / 12)).toFixed(1)) : 0);

  const totalTbDebit = trialBalance.reduce((acc, t) => acc + t.debitAmount, 0);
  const totalTbCredit = trialBalance.reduce((acc, t) => acc + t.creditAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Total Balance Sheet Assets"
          value={`₹${totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Bank, Cash & Receivables Assets"
          icon={Landmark}
          trend="Audited"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Total Liabilities & Capital"
          value={`₹${totalLiabilities.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Trade Payables & Duties"
          icon={Scale}
          trend="Current"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Net Working Capital"
          value={`₹${netWorkingCapital.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Assets minus Liabilities"
          icon={TrendingUp}
          trend={netWorkingCapital >= 0 ? "Positive Liquidity" : "Deficit"}
          trendDirection={netWorkingCapital >= 0 ? "up" : "down"}
        />
        <CorporateStatCard
          label="Estimated Cash Runway"
          value={`${cashRunway} Months`}
          subtext="Operational Burn Coverage"
          icon={Clock}
          trend="Adequate"
          trendDirection="up"
        />
      </div>

      {/* Sub Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("bs")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeSubTab === "bs" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Balance Sheet
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("pl")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeSubTab === "pl" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("tb")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeSubTab === "tb" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Trial Balance
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("aging")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeSubTab === "aging" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Bill-by-Bill Aging Analysis
        </button>
      </div>

      {/* 1. Balance Sheet */}
      {activeSubTab === "bs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold text-primary">Assets & Resources</CardTitle>
              <CardDescription className="text-xs">Bank, Cash, Receivables & Stock</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {balanceSheet.filter((b) => b.category === "Assets").length === 0 ? (
                <div className="p-6">
                  <CorporateEmptyState icon={Landmark} title="No Asset Ledgers" description="Asset accounts will display here." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ledger Account</TableHead>
                      <TableHead>Sub Group</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balanceSheet
                      .filter((b) => b.category === "Assets")
                      .map((b, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{b.ledgerName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{b.subGroup}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-right">
                            ₹{b.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold text-rose-600">Liabilities & Capital</CardTitle>
              <CardDescription className="text-xs">Trade Creditors, Duties & Borrowings</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {balanceSheet.filter((b) => b.category === "Liabilities").length === 0 ? (
                <div className="p-6">
                  <CorporateEmptyState icon={Scale} title="No Liability Ledgers" description="Liability accounts will display here." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ledger Account</TableHead>
                      <TableHead>Sub Group</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balanceSheet
                      .filter((b) => b.category === "Liabilities")
                      .map((b, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{b.ledgerName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{b.subGroup}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-right text-rose-600">
                            ₹{Math.abs(b.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Profit & Loss */}
      {activeSubTab === "pl" && (
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold">Profit & Loss Statement</CardTitle>
            <CardDescription className="text-xs">Operational Income vs Project & Administrative Expenses</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {profitAndLoss.length === 0 ? (
              <div className="p-6">
                <CorporateEmptyState icon={Scale} title="No Income / Expense Transactions" description="Post sales or expense vouchers to see P&L." />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Classification</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead>Account Group</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitAndLoss.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            p.type === "INCOME"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]"
                          }
                        >
                          {p.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{p.ledgerName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.category}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-right">
                        ₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Trial Balance */}
      {activeSubTab === "tb" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
            <div>
              <CardTitle className="text-base font-semibold">Trial Balance Statement</CardTitle>
              <CardDescription className="text-xs">
                Verification of double-entry ledger debit & credit balances
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs text-emerald-600">
                Debits: ₹{totalTbDebit.toLocaleString("en-IN")}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs text-primary">
                Credits: ₹{totalTbCredit.toLocaleString("en-IN")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {trialBalance.length === 0 ? (
              <div className="p-6">
                <CorporateEmptyState icon={Scale} title="No Ledgers Recorded" description="Create accounts and record vouchers to view Trial Balance." />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ledger Name</TableHead>
                    <TableHead>Account Group</TableHead>
                    <TableHead className="text-right">Debit Balance (₹)</TableHead>
                    <TableHead className="text-right">Credit Balance (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-semibold">{t.ledgerName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.primaryGroup}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-right text-emerald-600">
                        {t.debitAmount > 0 ? `₹${t.debitAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-right text-primary">
                        {t.creditAmount > 0 ? `₹${t.creditAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Bill-by-Bill Aging */}
      {activeSubTab === "aging" && (
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold">Bill-by-Bill Outstanding Aging Slabs</CardTitle>
            <CardDescription className="text-xs">
              Receivables and payables aged into 0-15, 16-30, 31-45, and 45+ overdue day slabs
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {agingReport.length === 0 ? (
              <div className="p-6">
                <CorporateEmptyState
                  icon={Clock}
                  title="No Overdue Bills Found"
                  description="Bill references recorded in vouchers will appear here with dynamic aging brackets."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party / Vendor</TableHead>
                    <TableHead className="text-right">Current (0-15d)</TableHead>
                    <TableHead className="text-right">16-30 Days</TableHead>
                    <TableHead className="text-right">31-45 Days</TableHead>
                    <TableHead className="text-right">45+ Days (Critical)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingReport.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-semibold">{a.partyName}</TableCell>
                      <TableCell className="font-mono text-xs text-right">
                        ₹{a.currentAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right">
                        ₹{a.days30.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right text-amber-600">
                        ₹{a.days60.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-right text-rose-600">
                        ₹{a.days90Plus.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
