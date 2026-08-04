"use client";

import React, { useState, useEffect } from "react";
import { Plus, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { financeApi, CostCenterBudget, BudgetAllocationPayload } from "@/services/financeApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";

interface ProjectOption {
  id: string;
  projectName: string;
  location: string;
}

interface CostCenterOption {
  id: string;
  costCenterCode: string;
  name: string;
  formattedLabel: string;
}

export function BudgetManagementView() {
  const [budgets, setBudgets] = useState<CostCenterBudget[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [costCenterOptions, setCostCenterOptions] = useState<CostCenterOption[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState<boolean>(false);
  const [budgetCode, setBudgetCode] = useState<string>("");
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>("");
  const [totalBudgetLakhs, setTotalBudgetLakhs] = useState<number | "">("");
  const [isCostCentreModalOpen, setIsCostCentreModalOpen] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [bRes, pRes, ccRes] = await Promise.all([
        financeApi.getBudgets(),
        fetch("/api/v1/projects").then((r) => r.json()),
        fetch("/api/v1/finance/cost-centers").then((r) => r.json()),
      ]);

      setBudgets(bRes);

      if (pRes.success && Array.isArray(pRes.data)) {
        setProjectOptions(pRes.data);
      }

      if (ccRes.success && Array.isArray(ccRes.data)) {
        setCostCenterOptions(ccRes.data);
        if (ccRes.data.length > 0 && !selectedCostCenterId) {
          setSelectedCostCenterId(ccRes.data[0].id);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cost center budgets could not be completed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAllocation = async () => {
    try {
      setIsSubmitting(true);
      if (!budgetCode.trim() || !selectedCostCenterId || typeof totalBudgetLakhs !== "number") {
        throw new Error("Budget reference, cost centre and allocated amount are required");
      }

      const payload: BudgetAllocationPayload = {
        budgetCode,
        costCenterId: selectedCostCenterId,
        totalBudgetLakhs,
      };

      const newBudget = await financeApi.createBudgetAllocation(payload);
      setBudgets((prev) => [...prev, newBudget]);
      setNotification(`Budget head ${newBudget.costCenterCode} allocated to ${newBudget.category}.`);
      setIsAllocateModalOpen(false);
      setBudgetCode("");
      setTotalBudgetLakhs("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Budget head could not be completed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card text-card-foreground p-4 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Cost Center Budget Allocations & Variance Control
          </h3>
        </div>

        <Button size="sm" className="h-9 text-xs gap-1.5 self-end md:self-auto shrink-0 font-medium" onClick={() => setIsAllocateModalOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Allocate Budget Head
        </Button>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            className="text-emerald-800 hover:text-emerald-950 font-bold ml-4 text-xs"
            onClick={() => setNotification(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Retrieving cost center budget ledger...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Budget Ledger Error"
          description={error}
          actionLabel="Retry Budget Query"
          onAction={loadData}
        />
      ) : budgets.length === 0 ? (
        <CorporateEmptyState
          title="No Cost Center Budgets Found"
          description="There are currently no active budget heads configured for Nashik development projects."
          actionLabel="Allocate Budget Head"
          onAction={() => setIsAllocateModalOpen(true)}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Cost Center Code</TableHead>
                <TableHead className="text-xs font-semibold">Project Development</TableHead>
                <TableHead className="text-xs font-semibold">Category Head</TableHead>
                <TableHead className="text-xs font-semibold text-right">Total Allocated (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Committed POs (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actual Disbursed (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Variance %</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((b) => {
                let badgeClass = "";
                if (b.variancePercentage < 80) {
                  badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                } else if (b.variancePercentage <= 95) {
                  badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
                } else {
                  badgeClass = "bg-red-100 text-red-800 border-red-300";
                }

                return (
                  <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs py-3 font-semibold text-foreground">
                      {b.costCenterCode}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {b.projectName}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {b.category}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                      ₹{b.totalBudgetLakhs.toFixed(2)} L
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono text-amber-800">
                      ₹{b.committedPoLakhs.toFixed(2)} L
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono text-emerald-800">
                      ₹{b.actualDisbursedLakhs.toFixed(2)} L
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono font-bold">
                      {b.variancePercentage.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                        {b.variancePercentage < 80
                          ? "< 80% SPENT"
                          : b.variancePercentage <= 95
                          ? "80-95% SPENT"
                          : "> 95% OVERRUN"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isAllocateModalOpen} onOpenChange={setIsAllocateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold font-heading">
              Allocate Cost Center Budget Head
            </DialogTitle>
            <DialogDescription className="sr-only">
              Define a new cost center code and capital expenditure allocation for Nashik developments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Budget Reference</Label>
              <Input
                value={budgetCode}
                onChange={(e) => setBudgetCode(e.target.value)}
                placeholder="e.g. BH-GNK-05"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Cost Centre</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] font-medium"
                  onClick={() => setIsCostCentreModalOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New Cost Centre
                </Button>
              </div>
              <Select value={selectedCostCenterId} onValueChange={(val) => val && setSelectedCostCenterId(val)}>
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue placeholder="Select cost centre" />
                </SelectTrigger>
                <SelectContent>
                  {costCenterOptions.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.formattedLabel}
                    </SelectItem>
                  ))}
                  {costCenterOptions.length === 0 && (
                    <div className="px-2 py-3 text-[11px] text-muted-foreground">No cost centres on record.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Total Budget Allocation (₹ Lakhs)</Label>
              <Input
                type="number"
                min="1"
                value={totalBudgetLakhs}
                onChange={(e) => setTotalBudgetLakhs(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setIsAllocateModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="sm" className="text-xs h-8 font-medium" onClick={handleCreateAllocation} disabled={isSubmitting}>
              {isSubmitting ? "Allocating..." : "Confirm Budget Head"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordFormModal
        isOpen={isCostCentreModalOpen}
        onClose={() => setIsCostCentreModalOpen(false)}
        onSaved={loadData}
        title="Register Cost Centre"
        endpoint="/api/v1/finance/cost-centers"
        submitLabel="Register Cost Centre"
        fields={[
          { name: "costCenterCode", label: "Cost Centre Code", type: "text", required: true, halfWidth: true },
          { name: "allocatedBudgetLakhs", label: "Allocated Budget (₹ Lakhs)", type: "number", required: true, halfWidth: true },
          { name: "name", label: "Cost Centre Name", type: "text", required: true },
          {
            name: "projectId",
            label: "Development",
            type: "select",
            options: projectOptions.map((p) => ({ value: p.id, label: `${p.projectName} (${p.location})` })),
          },
        ]}
      />
    </div>
  );
}
