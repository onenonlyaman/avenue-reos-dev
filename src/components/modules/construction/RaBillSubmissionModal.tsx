"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import { constructionApi, ContractorRaBill, SubmitRaBillPayload } from "@/services/constructionApi";
import { HITL_RA_BILL_LIMIT } from "@/lib/governance";

interface RaBillSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  selectedProject: string;
  onBillSubmitted: (newBill: ContractorRaBill) => void;
}

export function RaBillSubmissionModal({
  isOpen,
  onClose,
  projects,
  selectedProject,
  onBillSubmitted,
}: RaBillSubmissionModalProps) {
  const [projectId, setProjectId] = useState<string>(selectedProject || "");
  const [contractorName, setContractorName] = useState<string>("");
  const [wbsPhase, setWbsPhase] = useState<string>("");
  const [grossClaimLakhs, setGrossClaimLakhs] = useState<number | "">("");
  const [claimedProgressPct, setClaimedProgressPct] = useState<number | "">("");

  const [wbsPhases, setWbsPhases] = useState<string[]>([]);
  const [contractorNames, setContractorNames] = useState<string[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        setIsLoadingOptions(true);
        setOptionsError(null);
        const query = projectId && projectId !== "All Nashik Developments"
          ? `?projectId=${encodeURIComponent(projectId)}`
          : "";
        const res = await fetch(`/api/v1/construction/form-options${query}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || "Selection options could not be loaded");
        setWbsPhases(json.data.wbsPhases || []);
        setContractorNames(json.data.contractorNames || []);
        if (!wbsPhase && json.data.wbsPhases?.length > 0) setWbsPhase(json.data.wbsPhases[0]);
        if (!contractorName && json.data.contractorNames?.length > 0) setContractorName(json.data.contractorNames[0]);
      } catch (err: unknown) {
        setOptionsError(err instanceof Error ? err.message : "Contractors and work phases could not be loaded");
      } finally {
        setIsLoadingOptions(false);
      }
    };
    load();
  }, [isOpen, projectId]);

  const claimVal = typeof grossClaimLakhs === "number" ? grossClaimLakhs * 100000 : 0;
  const holdbackVal = claimVal * 0.05;
  const netBeforeGst = claimVal - holdbackVal;
  const gstVal = netBeforeGst * 0.18;
  const netPayableVal = netBeforeGst + gstVal;

  const requiresHitlPreview = claimVal > HITL_RA_BILL_LIMIT || (typeof claimedProgressPct === "number" && claimedProgressPct > 0);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!projectId) throw new Error("Select a project site before submitting.");
      if (!contractorName) throw new Error("Select a contractor before submitting.");
      if (!wbsPhase) throw new Error("Select a WBS execution phase before submitting.");
      if (!grossClaimLakhs) throw new Error("Enter gross claim amount before submitting.");

      const payload: SubmitRaBillPayload = {
        projectId,
        contractorName,
        wbsPhase,
        grossClaimLakhs: typeof grossClaimLakhs === "number" ? grossClaimLakhs : 0,
        claimedProgressPct: typeof claimedProgressPct === "number" ? claimedProgressPct : 0,
      };

      const newBill = await constructionApi.submitRaBill(payload);
      onBillSubmitted(newBill);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Contractor RA Bill could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl w-full p-6 bg-card text-card-foreground">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono">
              CONTRACTOR RA BILL RECONCILIATION
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              MEASUREMENT BOOK AUDIT
            </span>
          </div>
          <DialogTitle className="text-base font-bold font-heading">
            Submit Running Account (RA) Bill
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Calculate gross contractor claims, contractual 5% quality holdback, and 18% statutory GST.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {(error || optionsError) && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error || optionsError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Project Development Site</Label>
              <Select value={projectId} onValueChange={(val) => val && setProjectId(val)}>
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

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Contractor Entity</Label>
              {isLoadingOptions ? (
                <div className="h-8 flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading contractors...
                </div>
              ) : contractorNames.length === 0 ? (
                <Input
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="Enter contractor name"
                  className="h-8 text-xs"
                />
              ) : (
                <Select value={contractorName} onValueChange={(val) => val && setContractorName(val)}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Select Contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractorNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Execution Scope / WBS Phase</Label>
            {isLoadingOptions ? (
              <div className="h-8 flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading WBS phases...
              </div>
            ) : wbsPhases.length === 0 ? (
              <Input
                value={wbsPhase}
                onChange={(e) => setWbsPhase(e.target.value)}
                placeholder="Enter WBS phase or work description"
                className="h-8 text-xs"
              />
            ) : (
              <Select value={wbsPhase} onValueChange={(val) => val && setWbsPhase(val)}>
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue placeholder="Select WBS Phase" />
                </SelectTrigger>
                <SelectContent>
                  {wbsPhases.map((ph) => (
                    <SelectItem key={ph} value={ph}>
                      {ph}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Gross Claim Amount (₹ Lakhs)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={grossClaimLakhs}
                onChange={(e) => setGrossClaimLakhs(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="e.g. 38.50"
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Claimed Physical Progress (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={claimedProgressPct}
                onChange={(e) => setClaimedProgressPct(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="e.g. 75"
                className="h-8 text-xs font-mono font-bold"
              />
            </div>
          </div>

          {grossClaimLakhs !== "" && (
            <div className="space-y-2 border border-border rounded-lg p-3 bg-card text-xs">
              <div className="font-semibold text-foreground border-b border-border pb-1">
                Financial Breakdown & Deduction Audit
              </div>
              <div className="space-y-1 pt-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Claim Valuation</span>
                  <span className="font-semibold text-foreground">₹{(claimVal / 100000).toFixed(2)} Lakhs</span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>Contractual Quality Holdback (5%)</span>
                  <span>- ₹{(holdbackVal / 100000).toFixed(2)} Lakhs</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>Statutory GST (18%)</span>
                  <span>+ ₹{(gstVal / 100000).toFixed(2)} Lakhs</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-xs text-foreground">
                  <span>Net Disbursement Payable</span>
                  <span className="text-primary text-sm font-extrabold">₹{(netPayableVal / 100000).toFixed(2)} Lakhs</span>
                </div>
              </div>
            </div>
          )}

          {requiresHitlPreview && grossClaimLakhs !== "" && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold block mb-0.5">High-Value Contractor Claim Warning</span>
                Running Account bills exceeding ₹25 Lakhs or over-claiming physical WBS progress mandate Project Director HITL authorization before release to Finance.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-3 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={`h-8 text-xs font-medium ${requiresHitlPreview && grossClaimLakhs !== "" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingOptions}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Submitting Bill...
              </span>
            ) : requiresHitlPreview && grossClaimLakhs !== "" ? (
              "Submit for Project Director Sign-Off"
            ) : (
              "Submit RA Bill"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

