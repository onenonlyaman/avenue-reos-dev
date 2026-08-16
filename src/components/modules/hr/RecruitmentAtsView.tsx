"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { UserCheck, PlusCircle, AlertCircle, Loader2, ArrowRightCircle, Search, Filter } from "lucide-react";
import { hrApi, Candidate } from "@/services/hrApi";
import { CreateRequisitionModal } from "./CreateRequisitionModal";

export function RecruitmentAtsView() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [advancingCandidate, setAdvancingCandidate] = useState<Candidate | null>(null);
  const [nextStage, setNextStage] = useState<string>("Screening");
  const [interviewScore, setInterviewScore] = useState<number>(85);
  const [isSubmittingStage, setIsSubmittingStage] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await hrApi.getRecruitment();
      setCandidates(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Recruitment pipeline could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdvanceModal = (cand: Candidate) => {
    setAdvancingCandidate(cand);
    setInterviewScore(cand.interviewScore || 85);
    const stages = ["Applied", "Screening", "Technical Interview", "Site Assessment", "Offer Issued", "Hired", "Rejected"];
    const curIdx = stages.indexOf(cand.currentStage);
    const next = curIdx >= 0 && curIdx < stages.length - 2 ? stages[curIdx + 1] : "Offer Issued";
    setNextStage(next);
  };

  const handleAdvanceStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advancingCandidate) return;

    try {
      setIsSubmittingStage(true);
      setError(null);
      const updated = await hrApi.advanceCandidate(advancingCandidate.id, nextStage, Number(interviewScore) || 0);
      setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setAdvancingCandidate(null);
      setSuccessMessage(
        nextStage === "Hired"
          ? `${updated.candidateName} hired and onboarded into active workforce directory.`
          : `Candidate advanced to ${nextStage}.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update candidate stage");
    } finally {
      setIsSubmittingStage(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.candidateName.toLowerCase().includes(q) ||
      c.targetPosition.toLowerCase().includes(q) ||
      c.contactEmail.toLowerCase().includes(q);

    const matchesStage = stageFilter === "ALL" || c.currentStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading ATS applicant pipeline & site requisition data...</span>
      </div>
    );
  }

  if (error && candidates.length === 0) {
    return (
      <CorporateEmptyState
        title="Recruitment Service Error"
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
            Recruitment Applicant Tracking System (ATS) & Requisition Pipeline
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sourcing, interview assessment ratings, and candidate onboarding workflow.
          </p>
        </div>

        <Button size="sm" className="gap-1.5 text-xs font-semibold shrink-0" onClick={() => setIsModalOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Create Job Requisition
        </Button>
      </div>

      {successMessage && (
        <div className="p-3 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 rounded flex items-center justify-between">
          <span>{successMessage}</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSuccessMessage(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-lg border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate, position, or email..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-8 text-xs bg-background border border-border rounded px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Stages ({candidates.length})</option>
            <option value="Applied">Applied</option>
            <option value="Screening">Screening</option>
            <option value="Technical Interview">Technical Interview</option>
            <option value="Site Assessment">Site Assessment</option>
            <option value="Offer Issued">Offer Issued</option>
            <option value="Hired">Hired</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <CorporateEmptyState
          title={candidates.length === 0 ? "No Active Job Requisitions or Candidates" : "No Matching Candidates"}
          description={
            candidates.length === 0
              ? "There are currently no active candidate applications in the ATS pipeline. Create a new job requisition to open sourcing."
              : "No candidate applications matched the search criteria."
          }
          actionLabel="Create Job Requisition"
          onAction={() => setIsModalOpen(true)}
          icon={UserCheck}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Candidate Name</TableHead>
                  <TableHead className="text-xs font-semibold">Target Position</TableHead>
                  <TableHead className="text-xs font-semibold">Experience Level</TableHead>
                  <TableHead className="text-xs font-semibold">Current Pipeline Stage</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Interview Score</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((cand) => (
                  <TableRow key={cand.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      <div>{cand.candidateName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{cand.contactEmail || "Email N/A"}</div>
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {cand.targetPosition}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-muted-foreground">
                      {cand.experienceLevel}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      {cand.currentStage === "Hired" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          HIRED
                        </Badge>
                      ) : cand.currentStage === "Offer Issued" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-blue-100 text-blue-800 border-blue-300">
                          OFFER ISSUED
                        </Badge>
                      ) : cand.currentStage === "Rejected" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                          REJECTED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold border-border">
                          {cand.currentStage}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                      {cand.interviewScore > 0 ? `${cand.interviewScore} / 100` : "Pending Evaluation"}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right">
                      {cand.currentStage !== "Hired" && cand.currentStage !== "Rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => openAdvanceModal(cand)}
                        >
                          <ArrowRightCircle className="h-3 w-3 text-primary" />
                          Advance Stage
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Advance Candidate Stage Modal */}
      {advancingCandidate && (
        <Dialog open={Boolean(advancingCandidate)} onOpenChange={(open) => !open && setAdvancingCandidate(null)}>
          <DialogContent className="sm:max-w-[440px] border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Advance Pipeline Stage
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAdvanceStage} className="space-y-4 py-2">
              <div className="p-3 bg-muted/30 rounded border border-border text-xs space-y-1">
                <div className="font-bold text-foreground">{advancingCandidate.candidateName}</div>
                <div className="text-muted-foreground">{advancingCandidate.targetPosition} &bull; Current: {advancingCandidate.currentStage}</div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Move to Stage</Label>
                <select
                  value={nextStage}
                  onChange={(e) => setNextStage(e.target.value)}
                  className="w-full h-8 text-xs bg-background border border-border rounded px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Screening">Screening</option>
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="Site Assessment">Site Assessment</option>
                  <option value="Offer Issued">Offer Issued</option>
                  <option value="Hired">Hired (Auto-onboard to Employee Directory)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Interview / Assessment Score (0 - 100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={interviewScore}
                  onChange={(e) => setInterviewScore(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAdvancingCandidate(null)} disabled={isSubmittingStage}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingStage}>
                  {isSubmittingStage ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Confirm Stage Update"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <CreateRequisitionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newCand) => setCandidates((prev) => [newCand, ...prev])}
      />
    </div>
  );
}
