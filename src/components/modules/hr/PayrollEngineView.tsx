"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { DollarSign, ShieldAlert, Receipt, Play, AlertCircle, Loader2, ListCollapse } from "lucide-react";
import { hrApi, PayrollRun } from "@/services/hrApi";

interface PayrollEngineViewProps {
  onOpenHitlDrawer: () => void;
}

export function PayrollEngineView({ onOpenHitlDrawer }: PayrollEngineViewProps) {
  const [payroll, setPayroll] = useState<PayrollRun | null>(null);
  const [cycleMonth, setCycleMonth] = useState<string>(
    new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showItemized, setShowItemized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await hrApi.getPayroll();
      setPayroll(data);
      if (data?.cycleMonth) {
        setCycleMonth(data.cycleMonth);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payroll cycle data could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPayroll = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      const updated = await hrApi.processPayrollRun({ cycleMonth });
      setPayroll(updated);
      if (updated.requiresHitl) {
        onOpenHitlDrawer();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payroll run could not be completed");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Calculating gross salary roll, PF/ESIC deductions, and net payable batch...</span>
      </div>
    );
  }

  if (error && !payroll) {
    return (
      <CorporateEmptyState
        title="Payroll Engine Error"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Automated Payroll Batch Run & Indian Statutory Deductions Engine
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time computation from active workforce directory, EPFO Provident Fund, ESIC, and Maharashtra Professional Tax.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={cycleMonth}
            onChange={(e) => setCycleMonth(e.target.value)}
            placeholder="e.g. August 2026"
            className="h-8 text-xs w-36 font-semibold"
          />

          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={handleProcessPayroll}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run Payroll Batch
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
          {error}
        </div>
      )}

      {!payroll ? (
        <CorporateEmptyState
          title="No Active Payroll Cycle Initialized"
          description="No payroll run has been processed for the current month. Click below to initiate automated salary calculations from active employee records."
          actionLabel="Process Monthly Payroll Run"
          onAction={handleProcessPayroll}
          icon={DollarSign}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CorporateStatCard
              label="Total Gross Salary Roll"
              value={formatCurrency(payroll.totalGrossSalary)}
              subtext={`Cycle: ${payroll.cycleMonth}`}
              icon={DollarSign}
              trend={`${payroll.employeeCount} Active Personnel`}
              trendDirection="up"
            />

            <CorporateStatCard
              label="Statutory Deductions (PF/ESIC/PT)"
              value={formatCurrency(payroll.totalPfDeduction + payroll.totalEsicDeduction + payroll.totalPtDeduction)}
              subtext="PF 12% + ESIC 0.75% + PT"
              icon={Receipt}
              trend="EPFO & ESIC Compliance"
              trendDirection="neutral"
            />

            <CorporateStatCard
              label="Approved Site Expense Bills"
              value={formatCurrency(payroll.approvedExpenses)}
              subtext="Travel & Imprest Claims"
              icon={Receipt}
              trend="Reimbursements Batch"
              trendDirection="up"
            />

            <CorporateStatCard
              label="Net Bank Disbursement Roll"
              value={formatCurrency(payroll.netPayable)}
              subtext={payroll.requiresHitl ? "Locked by HITL Safeguard (> ₹10L)" : "Ready for Transfer"}
              icon={ShieldAlert}
              trend={payroll.status}
              trendDirection={payroll.requiresHitl ? "down" : "up"}
            />
          </div>

          <div className="border border-border rounded-lg p-5 bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Current Payroll Batch Status & Audit Safeguards
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Monthly payroll cycle breakdown for {payroll.cycleMonth}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {payroll.items && payroll.items.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowItemized(!showItemized)}
                  >
                    <ListCollapse className="h-3.5 w-3.5" />
                    {showItemized ? "Hide Salary Slips" : `View ${payroll.items.length} Salary Slips`}
                  </Button>
                )}

                {payroll.status === "PENDING_APPROVAL" ? (
                  <Badge variant="outline" className="text-xs font-bold bg-amber-100 text-amber-900 border-amber-300">
                    PENDING GOVERNANCE AUTHORIZATION
                  </Badge>
                ) : payroll.status === "DISBURSED" ? (
                  <Badge variant="outline" className="text-xs font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                    DISBURSED TO BANK LEDGER
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-bold bg-muted text-muted-foreground border-border">
                    {payroll.status}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Total Gross Salary</span>
                  <span className="font-bold text-foreground">{formatCurrency(payroll.totalGrossSalary)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Provident Fund (Employee Share 12%)</span>
                  <span className="font-bold text-foreground">{formatCurrency(payroll.totalPfDeduction)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">ESIC Contribution (0.75% where applicable)</span>
                  <span className="font-bold text-foreground">{formatCurrency(payroll.totalEsicDeduction)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Professional Tax (Maharashtra PT)</span>
                  <span className="font-bold text-foreground">{formatCurrency(payroll.totalPtDeduction)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Approved Site Expense Reimbursements</span>
                  <span className="font-bold text-foreground">{formatCurrency(payroll.approvedExpenses)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Human-in-the-Loop Threshold Safeguard</span>
                  <span className="font-bold text-amber-900">₹10 Lakhs (Enforced)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Requires Executive Director Authorization</span>
                  <span className="font-bold text-foreground">{payroll.requiresHitl ? "YES (Required)" : "NO"}</span>
                </div>
                <div className="flex justify-between py-1 text-sm pt-1 border-t border-border">
                  <span className="font-bold text-foreground">Total Net Bank Payable Roll</span>
                  <span className="font-bold text-primary">{formatCurrency(payroll.netPayable)}</span>
                </div>
              </div>
            </div>

            {payroll.requiresHitl && payroll.status === "PENDING_APPROVAL" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-amber-900">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>
                    Batch disbursement of {formatCurrency(payroll.netPayable)} exceeds ₹10 Lakhs threshold. Locked for Governance Director approval.
                  </span>
                </div>
                <Button size="sm" variant="outline" className="text-xs border-amber-300 bg-white" onClick={onOpenHitlDrawer}>
                  Review in Governance Drawer
                </Button>
              </div>
            )}
          </div>

          {showItemized && payroll.items && (
            <div className="bg-card rounded-lg border border-border shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20">
                <h4 className="text-xs font-bold text-foreground">
                  Itemized Employee Salary Slips ({payroll.items.length} records)
                </h4>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Employee</TableHead>
                      <TableHead className="text-xs font-semibold">Designation</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Basic</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Allowances</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Gross</TableHead>
                      <TableHead className="text-xs font-semibold text-right">PF (12%)</TableHead>
                      <TableHead className="text-xs font-semibold text-right">ESIC</TableHead>
                      <TableHead className="text-xs font-semibold text-right">PT</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Net Payable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payroll.items.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/30">
                        <TableCell className="text-xs py-2.5 font-semibold text-foreground">
                          {item.employeeName}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 text-muted-foreground">
                          {item.designation}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 text-right font-mono">
                          {formatCurrency(item.basicSalary)}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 text-right font-mono">
                          {formatCurrency(item.allowances)}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 text-right font-mono font-bold">
                          {formatCurrency(item.grossSalary)}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 text-right font-mono text-muted-foreground">
                          -{formatCurrency(item.pfDeduction)}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 text-right font-mono text-muted-foreground">
                          -{formatCurrency(item.esicDeduction)}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 text-right font-mono text-muted-foreground">
                          -{formatCurrency(item.ptDeduction)}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 text-right font-mono font-extrabold text-primary">
                          {formatCurrency(item.netSalary)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
