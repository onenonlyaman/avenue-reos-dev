"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Plus, ShieldAlert, AlertCircle, Loader2, FileText } from "lucide-react";
import { constructionApi, ContractorRaBill } from "@/services/constructionApi";
import { RaBillSubmissionModal } from "./RaBillSubmissionModal";

interface ContractorBillsViewProps {
  projects: Array<{ id: string; name: string }>;
  selectedProject: string;
  onProjectChange: (project: string) => void;
  onOpenApprovalDrawer?: () => void;
}

export function ContractorBillsView({
  projects,
  selectedProject,
  onProjectChange,
  onOpenApprovalDrawer,
}: ContractorBillsViewProps) {
  const [bills, setBills] = useState<ContractorRaBill[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState<boolean>(false);

  const loadBills = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await constructionApi.getRaBills(selectedProject);
      setBills(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Contractor RA Bills could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [selectedProject]);

  const handleBillSubmitted = (newBill: ContractorRaBill) => {
    setBills((prev) => [newBill, ...prev]);
  };

  const pendingCount = bills.filter((b) => b.status === "PENDING_APPROVAL").length;

  return (
    <div className="space-y-4">
      <div className="bg-card text-card-foreground p-4 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Contractor Running Account (RA) Billing & Measurement Ledger
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 self-end md:self-auto shrink-0">
          <div className="w-full sm:w-64">
            <Select value={selectedProject} onValueChange={(val) => val && onProjectChange(val)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {onOpenApprovalDrawer && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 shrink-0 font-medium"
              onClick={onOpenApprovalDrawer}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
              Director Approval Queue
              <Badge variant="secondary" className="bg-amber-200 text-amber-950 text-[9px] px-1 py-0 ml-0.5 font-bold">
                {pendingCount}
              </Badge>
            </Button>
          )}

          <Button size="sm" className="h-8 text-xs gap-1.5 font-medium shrink-0" onClick={() => setIsSubmissionModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Submit Running Account Bill
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading contractor bills...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="RA Billing Ledger Error"
          description={error}
          actionLabel="Retry"
          onAction={loadBills}
          icon={AlertCircle}
        />
      ) : bills.length === 0 ? (
        <CorporateEmptyState
          title="No Contractor RA Bills Found"
          description="There are currently no active Running Account bills logged for the selected project site."
          actionLabel="Submit Running Account Bill"
          onAction={() => setIsSubmissionModalOpen(true)}
          icon={FileText}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Bill Reference</TableHead>
                <TableHead className="text-xs font-semibold">Contractor Name</TableHead>
                <TableHead className="text-xs font-semibold">Work Scope / WBS Phase</TableHead>
                <TableHead className="text-xs font-semibold text-right">Claimed Amount (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Verified Amount (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-right">5% Quality Holdback (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Approval Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => {
                let badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                let statusText = "Pending Director Sign-Off";

                if (b.status === "APPROVED") {
                  badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                  statusText = "Approved & Posted to Finance";
                } else if (b.status === "REJECTED") {
                  badgeStyle = "bg-red-100 text-red-800 border-red-300";
                  statusText = "Rejected for Re-Measurement";
                }

                return (
                  <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs py-3 font-semibold text-foreground">
                      <div>{b.billReference}</div>
                      <span className="text-[10px] font-sans text-muted-foreground font-normal">{b.projectName}</span>
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {b.contractorName}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {b.wbsPhase}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                      ₹{b.grossClaimLakhs.toFixed(2)} L
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono text-emerald-800 font-semibold">
                      ₹{b.verifiedLakhs.toFixed(2)} L
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono text-amber-800">
                      ₹{b.retainedHoldbackLakhs.toFixed(2)} L
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-bold ${badgeStyle}`}>
                        {statusText}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <RaBillSubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        projects={projects}
        selectedProject={selectedProject}
        onBillSubmitted={handleBillSubmitted}
      />
    </div>
  );
}
