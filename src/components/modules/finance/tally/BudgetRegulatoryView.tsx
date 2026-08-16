"use client";

import React, { useState, useEffect } from "react";
import { tallyErpApi } from "@/services/tallyErpApi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { ShieldCheck, BookOpen, AlertCircle, FileText } from "lucide-react";

export function BudgetRegulatoryView() {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadRegulatoryData = async () => {
    setIsLoading(true);
    try {
      const res = await tallyErpApi.fetchRegulatoryRules();
      setData(res);
    } catch (err: any) {
      toast({ title: "Failed to load Regulatory Rules", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRegulatoryData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
        Loading Budget 2026 Statutory Rules Engine...
      </div>
    );
  }

  const rules = data?.statutoryRules || [];
  const tdsSections = data?.tdsSections || [];
  const msme43bh = data?.msmeRule43bh;

  return (
    <div className="space-y-6">
      {/* Legislative Framework Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
            <BookOpen className="h-4 w-4" />
            <span>Budget 2026 Date-Bounded Legislative Architecture</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Accounting and tax calculation engines evaluate transaction posting dates dynamically against versioned
            statutory schemas. This guarantees historical audit integrity when tax amendments are passed.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TDS Section Thresholds */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold">TDS Sections & Statutory Thresholds (FY 2026-27)</CardTitle>
            <CardDescription className="text-xs">Withholding tax rates and single/aggregate thresholds</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Threshold Limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tdsSections.map((s: any) => (
                  <TableRow key={s.section}>
                    <TableCell className="font-mono text-xs font-bold text-primary">{s.section}</TableCell>
                    <TableCell className="text-xs">{s.description}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-right">
                      ₹{s.threshold.toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 43B(h) MSME Compliance Rules */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold">Section 43B(h) MSME Payment Compliance Window</CardTitle>
            <CardDescription className="text-xs">Mandatory payment timelines to avoid income tax disallowance</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="text-xs font-semibold text-foreground">Without Written Agreement:</span>
              <p className="text-xs font-mono font-bold text-primary">
                {msme43bh?.withoutAgreementWindowDays || 15} Days Maximum from Invoice Receipt
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="text-xs font-semibold text-foreground">With Written Commercial Agreement:</span>
              <p className="text-xs font-mono font-bold text-primary">
                {msme43bh?.withAgreementMaxWindowDays || 45} Days Statutory Ceiling
              </p>
            </div>

            <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-1">
              <span className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> Delay Penalty & Disallowance:
              </span>
              <p className="text-xs text-muted-foreground">
                Delayed MSME payouts are disallowed as business expense under Section 43B(h) until actual payment, and
                incur {msme43bh?.interestRatePenalty || "3x RBI Bank Rate compounding monthly"}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date-Bounded Versioned Schemas */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold">Active Date-Bounded Statutory Rule Sets</CardTitle>
          <CardDescription className="text-xs">
            Dynamic schema registry mapped to transaction timestamps
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r: any) => (
                <TableRow key={r.ruleCode}>
                  <TableCell className="font-mono text-xs font-bold text-primary">{r.ruleCode}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {r.ruleCategory}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.effectiveFrom}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.description}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      ACTIVE
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
