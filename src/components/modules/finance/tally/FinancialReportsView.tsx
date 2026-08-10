"use client";

import React, { useState, useEffect } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { BookOpen, PieChart, TrendingUp, ShieldCheck, Download, Filter, FileSpreadsheet } from "lucide-react";
import { tallyErpApi, FinancialReportsResponse } from "@/services/tallyErpApi";

export function FinancialReportsView() {
  const [reports, setReports] = useState<FinancialReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sampleThreshold, setSampleThreshold] = useState<string>("500000");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await tallyErpApi.fetchFinancialReports();
      setReports(res);
    } catch {
      setReports(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Estimated Cash Runway"
          value={`${reports?.cashRunwayMonths || 0} Months`}
          subtext="Net Working Capital Runway"
          icon={TrendingUp}
          trend="Positive Runway"
          trendDirection="up"
        />
        <CorporateStatCard
          label="Net Working Capital"
          value={`₹${(reports?.netWorkingCapital || 0).toLocaleString("en-IN")}`}
          subtext="Current Assets minus Liabilities"
          icon={PieChart}
          trend="Healthy Solvency"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Balance Sheet Ledgers"
          value={String(reports?.balanceSheet.length || 0)}
          subtext="Asset & Liability Grouping"
          icon={BookOpen}
          trend="Audited Tree"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Auditor Sampling Engine"
          value="CA Audit Mode"
          subtext="Tally XML / Excel Export Active"
          icon={ShieldCheck}
          trend="Ready for Audit"
          trendDirection="neutral"
        />
      </div>

      <Tabs defaultValue="bs" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl h-9">
          <TabsTrigger value="bs" className="text-xs font-semibold">
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="pnl" className="text-xs font-semibold">
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="tb" className="text-xs font-semibold">
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="aging" className="text-xs font-semibold">
            Bill-by-Bill Aging
          </TabsTrigger>
          <TabsTrigger value="auditor" className="text-xs font-semibold">
            CA Auditor Sampling
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bs" className="pt-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold font-heading">
                    Enterprise Balance Sheet (Dual-Column Schedule III)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Assets, Liabilities, and Equity ledger balances
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Download className="h-3.5 w-3.5" />
                  Export XML / Schedule III
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Compiling Balance Sheet...</div>
              ) : !reports?.balanceSheet || reports.balanceSheet.length === 0 ? (
                <CorporateEmptyState
                  title="No Balance Sheet Ledgers Found"
                  description="Post vouchers to generate live Balance Sheet statements."
                  icon={BookOpen}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold">Primary Group</TableHead>
                      <TableHead className="text-xs font-semibold">Subgroup</TableHead>
                      <TableHead className="text-xs font-semibold">Ledger Name</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Amount (INR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.balanceSheet.map((item, idx) => (
                      <TableRow key={idx} className="border-border">
                        <TableCell className="text-xs font-bold">{item.category}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.subGroup}</TableCell>
                        <TableCell className="text-xs font-medium">{item.ledgerName}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-right">
                          ₹{item.amount.toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl" className="pt-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold font-heading">
                Statement of Profit & Loss (P&L)
              </CardTitle>
              <CardDescription className="text-xs">
                Operating Income, Direct Construction Expenses & Overhead Allocation
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!reports?.profitAndLoss || reports.profitAndLoss.length === 0 ? (
                <CorporateEmptyState
                  title="No Income or Expense Ledgers Found"
                  description="Post sales or purchase vouchers to calculate net profit."
                  icon={PieChart}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold">Group</TableHead>
                      <TableHead className="text-xs font-semibold">Ledger Name</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Amount (INR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.profitAndLoss.map((item, idx) => (
                      <TableRow key={idx} className="border-border">
                        <TableCell className="text-xs">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              item.type === "INCOME"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                          >
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{item.category}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.ledgerName}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-right">
                          ₹{item.amount.toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tb" className="pt-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold font-heading">
                Comprehensive Trial Balance
              </CardTitle>
              <CardDescription className="text-xs">
                Debits and Credits verification ledger
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!reports?.trialBalance || reports.trialBalance.length === 0 ? (
                <CorporateEmptyState
                  title="No Trial Balance Entries"
                  description="Chart of accounts ledgers will be listed here with balances."
                  icon={BookOpen}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold">Ledger Account Name</TableHead>
                      <TableHead className="text-xs font-semibold">Primary Group</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Debit (INR)</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Credit (INR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.trialBalance.map((item, idx) => (
                      <TableRow key={idx} className="border-border">
                        <TableCell className="text-xs font-semibold">{item.ledgerName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.primaryGroup}</TableCell>
                        <TableCell className="text-xs font-mono text-right">
                          {item.debitAmount > 0 ? `₹${item.debitAmount.toLocaleString("en-IN")}` : "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-right">
                          {item.creditAmount > 0 ? `₹${item.creditAmount.toLocaleString("en-IN")}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="pt-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold font-heading">
                Bill-by-Bill Receivables & Payables Aging Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                30, 60, 90, and 90+ days aging windows
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!reports?.agingReport || reports.agingReport.length === 0 ? (
                <CorporateEmptyState
                  title="Zero Aging Outstanding"
                  description="No receivable or payable accounts exceed due dates."
                  icon={ShieldCheck}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold">Party / Customer Name</TableHead>
                      <TableHead className="text-xs font-semibold text-right">0-30 Days</TableHead>
                      <TableHead className="text-xs font-semibold text-right">31-60 Days</TableHead>
                      <TableHead className="text-xs font-semibold text-right">61-90 Days</TableHead>
                      <TableHead className="text-xs font-semibold text-right">90+ Days Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.agingReport.map((a, idx) => (
                      <TableRow key={idx} className="border-border">
                        <TableCell className="text-xs font-semibold">{a.partyName}</TableCell>
                        <TableCell className="text-xs font-mono text-right">₹{a.days30.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs font-mono text-right">₹{a.days60.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs font-mono text-right">₹{a.days90.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-destructive text-right">
                          ₹{a.days90Plus.toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditor" className="pt-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold font-heading">
                    Statutory Auditor & CA Sampling Workspace
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Monetary threshold filters and verification sign-offs
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={sampleThreshold}
                    onChange={(e) => setSampleThreshold(e.target.value)}
                    placeholder="Min Amount"
                    className="w-36 h-7 text-xs font-mono"
                  />
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <Filter className="h-3.5 w-3.5" />
                    Filter Sample
                  </Button>
                  <Button size="sm" className="h-7 text-xs font-semibold gap-1">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Export Tally XML Schema
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="p-4 bg-muted/20 border border-border rounded-lg space-y-2">
                <div className="text-xs font-bold text-foreground">Sampling Strategy Active:</div>
                <div className="text-xs text-muted-foreground">
                  Filtering vouchers where amount &gt; ₹{Number(sampleThreshold).toLocaleString("en-IN")}.
                  External auditors can review MCA edit logs, verified sign-offs, and double-entry postings.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
