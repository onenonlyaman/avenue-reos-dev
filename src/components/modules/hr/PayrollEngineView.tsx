"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { DollarSign, ShieldAlert, Receipt, Play, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { hrApi, PayrollRun } from "@/services/hrApi";

interface PayrollEngineViewProps {
  onOpenHitlDrawer: () => void;
}

export function PayrollEngineView({ onOpenHitlDrawer }: PayrollEngineViewProps) {
  const [payroll, setPayroll] = useState<PayrollRun | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await hrApi.getPayroll();
      setPayroll(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payroll cycle data could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPayroll = async () => {
    try {
      setIsProcessing(true);
      const updated = await hrApi.processPayrollRun({
        cycleMonth: "August 2026",
        totalGrossSalary: 1450000,
        netPayable: 1280000,
      });
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Calculating gross salary roll, PF/ESIC deductions, and net payable batch...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Payroll Engine Service Unreachable"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Automated Payroll Batch Run & Indian Statutory Deductions Engine
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
            <Receipt className="h-3.5 w-3.5" />
            Reimburse Employee Bills
          </Button>

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
            Process Monthly Payroll Run
          </Button>
        </div>
      </div>

      {!payroll ? (
        <CorporateEmptyState
          title="No Active Payroll Cycle Initialized"
          description="No payroll run has been processed for the current month. Click below to initiate the automated salary calculation for all active site and HQ personnel."
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
              subtext="Travel & Imprest Bills"
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

              <div>
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
                  <span className="text-muted-foreground">Basic Salary & HRA Allocation</span>
                  <span className="font-bold text-foreground">{formatCurrency(payroll.totalGrossSalary * 0.85)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Provident Fund (Employees' Share 12%)</span>
                  <span className="font-bold text-foreground">{formatCurrency(payroll.totalPfDeduction)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">ESIC Contribution (0.75%)</span>
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
        </div>
      )}
    </div>
  );
}
