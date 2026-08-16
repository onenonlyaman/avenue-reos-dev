"use client";

import React, { useState } from "react";
import { tallyErpApi } from "@/services/tallyErpApi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Calculator, TrendingUp, DollarSign, Clock, Printer } from "lucide-react";

export function FinancialToolsCalculatorsView() {
  const [activeTool, setActiveTool] = useState<"gst" | "cashflow" | "forecast" | "interest" | "invoice">("gst");

  // GST Calculator State
  const [gstPrice, setGstPrice] = useState<string>("118000");
  const [gstRate, setGstRate] = useState<string>("18");
  const [gstMode, setGstMode] = useState<"EXCLUSIVE" | "INCLUSIVE">("INCLUSIVE");
  const [gstResult, setGstResult] = useState<any>(null);

  // Cashflow Modeler State
  const [startingLiquidity, setStartingLiquidity] = useState<string>("2500000");
  const [netIncome, setNetIncome] = useState<string>("600000");
  const [deltaReceivables, setDeltaReceivables] = useState<string>("-150000");
  const [deltaPayables, setDeltaPayables] = useState<string>("80000");
  const [depreciation, setDepreciation] = useState<string>("50000");
  const [cashflowPeriods, setCashflowPeriods] = useState<any[]>([]);

  // SES Forecaster State
  const [forecastAlpha, setForecastAlpha] = useState<string>("0.35");
  const [forecastResult, setForecastResult] = useState<any[]>([]);

  // Overdue Interest State
  const [overduePrincipal, setOverduePrincipal] = useState<string>("350000");
  const [interestRate, setInterestRate] = useState<string>("18");
  const [daysOverdue, setDaysOverdue] = useState<string>("45");
  const [interestResult, setInterestResult] = useState<any>(null);

  // Printable Invoice State
  const [invCustomer, setInvCustomer] = useState<string>("Rajesh Enterprises");
  const [invGstin, setInvGstin] = useState<string>("27AAACR1234F1Z5");
  const [invItem, setInvItem] = useState<string>("Sector 4 Plot Advance Booking");
  const [invAmount, setInvAmount] = useState<string>("2500000");

  const handleCalculateGst = async () => {
    try {
      const res = await tallyErpApi.executeFinancialTool("GST_CALCULATOR", {
        price: parseFloat(gstPrice) || 0,
        gstRate: parseFloat(gstRate) || 18,
        mode: gstMode,
        isInterState: false,
      });
      setGstResult(res);
    } catch (err: any) {
      toast({ title: "Calculation Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleModelCashflow = async () => {
    try {
      const periods = [
        {
          periodLabel: "Month 1 (Immediate)",
          netOperatingIncome: parseFloat(netIncome) || 0,
          deltaReceivables: parseFloat(deltaReceivables) || 0,
          deltaPayables: parseFloat(deltaPayables) || 0,
          nonCashDepreciation: parseFloat(depreciation) || 0,
        },
        {
          periodLabel: "Month 2 (Projected)",
          netOperatingIncome: (parseFloat(netIncome) || 0) * 1.1,
          deltaReceivables: (parseFloat(deltaReceivables) || 0) * 0.8,
          deltaPayables: (parseFloat(deltaPayables) || 0) * 1.05,
          nonCashDepreciation: parseFloat(depreciation) || 0,
        },
        {
          periodLabel: "Month 3 (Projected)",
          netOperatingIncome: (parseFloat(netIncome) || 0) * 1.15,
          deltaReceivables: (parseFloat(deltaReceivables) || 0) * 0.7,
          deltaPayables: (parseFloat(deltaPayables) || 0) * 0.9,
          nonCashDepreciation: parseFloat(depreciation) || 0,
        },
      ];

      const res = await tallyErpApi.executeFinancialTool("CASHFLOW_LIQUIDITY", {
        startingBalance: parseFloat(startingLiquidity) || 0,
        periods,
      });
      setCashflowPeriods(res || []);
    } catch (err: any) {
      toast({ title: "Cashflow Modeling Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRunForecast = async () => {
    try {
      // Pull actual historical monthly voucher volume from database vouchers
      const vouchers = await tallyErpApi.fetchVouchers("STATUTORY");
      const monthlyRevenueMap: Record<string, number> = {};

      vouchers.forEach((v) => {
        if (v.status === "POSTED" && (v.voucherType === "RECEIPT" || v.voucherType === "SALES")) {
          const date = new Date(v.postingDate);
          const key = date.toLocaleString("en-US", { month: "short", year: "numeric" });
          monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + Number(v.totalAmount);
        }
      });

      let history = Object.entries(monthlyRevenueMap).map(([period, revenue]) => ({
        period,
        revenue,
      }));

      if (history.length === 0) {
        history = [
          { period: "Current Period", revenue: vouchers.reduce((acc, v) => acc + (v.status === "POSTED" ? Number(v.totalAmount) : 0), 0) }
        ];
      }

      const res = await tallyErpApi.executeFinancialTool("REVENUE_FORECAST_SES", {
        historicalData: history,
        alpha: parseFloat(forecastAlpha) || 0.3,
        futurePeriods: 3,
      });
      setForecastResult(res || []);
    } catch (err: any) {
      toast({ title: "Forecasting Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCalculateInterest = async () => {
    try {
      const res = await tallyErpApi.executeFinancialTool("OVERDUE_INTEREST", {
        outstandingPrincipal: parseFloat(overduePrincipal) || 0,
        annualInterestRatePct: parseFloat(interestRate) || 18,
        daysOverdue: parseFloat(daysOverdue) || 0,
        graceDays: 0,
      });
      setInterestResult(res);
    } catch (err: any) {
      toast({ title: "Interest Calculation Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Tool Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTool("gst")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
            activeTool === "gst" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Calculator className="h-3.5 w-3.5" /> GST Invariant Calculator
        </button>
        <button
          type="button"
          onClick={() => setActiveTool("cashflow")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
            activeTool === "cashflow" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" /> Cashflow Liquidity Modeler
        </button>
        <button
          type="button"
          onClick={() => setActiveTool("forecast")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
            activeTool === "forecast" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" /> SES Revenue Forecaster
        </button>
        <button
          type="button"
          onClick={() => setActiveTool("interest")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
            activeTool === "interest" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Overdue Bill Interest
        </button>
        <button
          type="button"
          onClick={() => setActiveTool("invoice")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
            activeTool === "invoice" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Printer className="h-3.5 w-3.5" /> Tax Invoice Template
        </button>
      </div>

      {/* 1. GST Calculator */}
      {activeTool === "gst" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">GST Exclusive / Inclusive Base Extractor</CardTitle>
              <CardDescription>
                Accurate taxable base price extraction and CGST/SGST/IGST tax allocation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Calculation Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={gstMode === "INCLUSIVE" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGstMode("INCLUSIVE")}
                    className="text-xs"
                  >
                    Tax-Inclusive (Base Extraction)
                  </Button>
                  <Button
                    type="button"
                    variant={gstMode === "EXCLUSIVE" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGstMode("EXCLUSIVE")}
                    className="text-xs"
                  >
                    Tax-Exclusive (Add GST)
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Input Amount (₹)</label>
                  <Input
                    type="number"
                    value={gstPrice}
                    onChange={(e) => setGstPrice(e.target.value)}
                    placeholder="0.00"
                    className="font-mono text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">GST Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-bold"
                  >
                    <option value="5">GST 5%</option>
                    <option value="12">GST 12%</option>
                    <option value="18">GST 18% (Standard)</option>
                    <option value="28">GST 28%</option>
                  </select>
                </div>
              </div>

              <Button onClick={handleCalculateGst} className="w-full font-bold">
                Calculate Exact Tax Breakdown
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Computed Tax Breakdown</CardTitle>
              <CardDescription>Mathematical invariant tax extraction results</CardDescription>
            </CardHeader>
            <CardContent>
              {gstResult ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2.5 rounded bg-background border border-border">
                    <span className="text-xs text-muted-foreground">Taxable Base Price:</span>
                    <span className="text-sm font-mono font-bold">
                      ₹{gstResult.basePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded bg-background border border-border">
                    <span className="text-xs text-muted-foreground">Central GST (CGST):</span>
                    <span className="text-sm font-mono text-primary">
                      ₹{gstResult.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded bg-background border border-border">
                    <span className="text-xs text-muted-foreground">State GST (SGST):</span>
                    <span className="text-sm font-mono text-primary">
                      ₹{gstResult.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded bg-background border border-border font-bold">
                    <span className="text-xs">Total Invoice Value:</span>
                    <span className="text-base font-mono text-primary">
                      ₹{gstResult.totalInvoicePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Click 'Calculate Exact Tax Breakdown' to view results.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Cashflow Liquidity Modeler */}
      {activeTool === "cashflow" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Working Capital Liquidity Modeler</CardTitle>
            <CardDescription>
              Formula: CF_t = N_t + Delta_AR_t - Delta_AP_t + NonCash_t
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Starting Cash (₹)</label>
                <Input
                  type="number"
                  value={startingLiquidity}
                  onChange={(e) => setStartingLiquidity(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Net Income (N_t)</label>
                <Input
                  type="number"
                  value={netIncome}
                  onChange={(e) => setNetIncome(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Delta Receivables (AR)</label>
                <Input
                  type="number"
                  value={deltaReceivables}
                  onChange={(e) => setDeltaReceivables(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Delta Payables (AP)</label>
                <Input
                  type="number"
                  value={deltaPayables}
                  onChange={(e) => setDeltaPayables(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Depreciation (NonCash)</label>
                <Input
                  type="number"
                  value={depreciation}
                  onChange={(e) => setDepreciation(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <Button onClick={handleModelCashflow} className="font-bold">
              Run Liquidity Simulation
            </Button>

            {cashflowPeriods.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {cashflowPeriods.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                    <span className="text-xs font-bold text-foreground">{p.periodLabel}</span>
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-muted-foreground">Net Cashflow:</span>
                      <span className={`font-mono font-bold ${p.netCashflow >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {p.netCashflow >= 0 ? "+" : ""}₹{p.netCashflow.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Cumulative Liquidity:</span>
                      <span className="font-mono font-bold text-primary">
                        ₹{p.cumulativeLiquidity.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Single Exponential Smoothing (SES) Forecaster */}
      {activeTool === "forecast" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Single Exponential Smoothing (SES) Forecaster</CardTitle>
            <CardDescription>Formula: F_(t+1) = alpha * Y_t + (1 - alpha) * F_t</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 max-w-sm">
              <div className="space-y-1 flex-1">
                <label className="text-xs font-semibold">Smoothing Factor (alpha: 0 to 1)</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="0.95"
                  value={forecastAlpha}
                  onChange={(e) => setForecastAlpha(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <Button onClick={handleRunForecast} className="mt-5 font-bold">
                Project Revenue
              </Button>
            </div>

            {forecastResult.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {forecastResult.map((f, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                    <span className="text-xs font-bold text-foreground">{f.period}</span>
                    {f.actualRevenue !== undefined && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Actual Revenue:</span>
                        <span className="font-mono">₹{f.actualRevenue.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-bold text-primary pt-1">
                      <span>Forecasted:</span>
                      <span className="font-mono">₹{f.forecastedRevenue.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Overdue Bill Interest */}
      {activeTool === "interest" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">365-Day Overdue Bill Interest Calculator</CardTitle>
              <CardDescription>Formula: I = P * (r / 100) * (d / 365)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Outstanding Bill Principal (₹)</label>
                <Input
                  type="number"
                  value={overduePrincipal}
                  onChange={(e) => setOverduePrincipal(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Annual Interest Rate (%)</label>
                  <Input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Days Overdue</label>
                  <Input
                    type="number"
                    value={daysOverdue}
                    onChange={(e) => setDaysOverdue(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <Button onClick={handleCalculateInterest} className="w-full font-bold">
                Compute Overdue Penalty & Interest
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Interest & Total Payable</CardTitle>
              <CardDescription>Accrued statutory delay penalty</CardDescription>
            </CardHeader>
            <CardContent>
              {interestResult ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2.5 rounded bg-muted/20 border border-border">
                    <span className="text-xs text-muted-foreground">Original Principal:</span>
                    <span className="font-mono text-sm">
                      ₹{parseFloat(overduePrincipal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded bg-rose-500/5 border border-rose-500/20">
                    <span className="text-xs text-rose-600 font-semibold">Accrued Interest Penalty:</span>
                    <span className="font-mono text-sm font-bold text-rose-600">
                      ₹{interestResult.interestAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded bg-primary/5 border border-primary/20 font-bold">
                    <span className="text-xs text-primary">Total Payable (Principal + Interest):</span>
                    <span className="font-mono text-base text-primary">
                      ₹{interestResult.totalPayableWithInterest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Input principal and overdue days to calculate penalty.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Printable Tax Invoice Template */}
      {activeTool === "invoice" && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Print-Ready Tax Invoice Designer</CardTitle>
              <CardDescription>Standard GST compliant invoice layout with embedded QR and signature block</CardDescription>
            </div>
            <Button size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
              <Printer className="h-3.5 w-3.5" /> Print Tax Invoice
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border border-border p-6 rounded-lg bg-background space-y-6 max-w-3xl mx-auto shadow-sm">
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-primary">AVENUE INFRASTRUCTURE DEVELOPERS</h3>
                  <p className="text-xs text-muted-foreground">GSTIN: 27AABCR1234F1Z5 | PAN: AABCR1234F</p>
                  <p className="text-xs text-muted-foreground">Commercial Complex, Gangapur Road, Nashik - 422005</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-primary/10 text-primary border-primary/20">TAX INVOICE</Badge>
                  <p className="text-xs font-mono font-bold mt-1">INV-2026-0042</p>
                  <p className="text-xs text-muted-foreground">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground">Billed To (Customer):</span>
                  <Input
                    value={invCustomer}
                    onChange={(e) => setInvCustomer(e.target.value)}
                    className="h-7 text-xs font-bold mt-1"
                  />
                  <Input
                    value={invGstin}
                    onChange={(e) => setInvGstin(e.target.value)}
                    placeholder="Customer GSTIN"
                    className="h-7 text-xs font-mono mt-1"
                  />
                </div>
                <div className="text-right">
                  <span className="font-semibold text-muted-foreground">Place of Supply:</span>
                  <p className="font-bold text-xs mt-1">27 - Maharashtra</p>
                  <span className="font-semibold text-muted-foreground">IRN Reference:</span>
                  <p className="font-mono text-[10px] text-muted-foreground truncate">
                    a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0
                  </p>
                </div>
              </div>

              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-center">HSN/SAC</th>
                      <th className="p-2 text-right">Taxable Value</th>
                      <th className="p-2 text-right">GST (18%)</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 font-medium">{invItem}</td>
                      <td className="p-2 text-center font-mono">995411</td>
                      <td className="p-2 text-right font-mono">₹{parseFloat(invAmount).toLocaleString("en-IN")}</td>
                      <td className="p-2 text-right font-mono">
                        ₹{(parseFloat(invAmount) * 0.18).toLocaleString("en-IN")}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-primary">
                        ₹{(parseFloat(invAmount) * 1.18).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground font-semibold">Bank Wire Instructions:</p>
                  <p className="font-mono">HDFC Corporate A/c: 50200098765432 | IFSC: HDFC0000123</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">For Avenue Infrastructure Developers</p>
                  <p className="text-muted-foreground mt-4">Authorized Executive Signatory</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
