"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { UserCheck, PlusCircle, AlertCircle, Loader2 } from "lucide-react";
import { hrApi, Candidate } from "@/services/hrApi";
import { CreateRequisitionModal } from "./CreateRequisitionModal";

export function RecruitmentAtsView() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading ATS applicant pipeline & site requisition data...</span>
      </div>
    );
  }

  if (error) {
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
        </div>

        <Button size="sm" className="gap-1.5 text-xs font-semibold shrink-0" onClick={() => setIsModalOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Create Job Requisition
        </Button>
      </div>

      {candidates.length === 0 ? (
        <CorporateEmptyState
          title="No Active Job Requisitions or Candidates"
          description="There are currently no active candidate applications in the ATS pipeline. Create a new job requisition for site supervisors or corporate staff to open sourcing."
          actionLabel="Create Job Requisition"
          onAction={() => setIsModalOpen(true)}
          icon={UserCheck}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
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
              {candidates.map((cand) => (
                <TableRow key={cand.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    <div>{cand.candidateName}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{cand.contactEmail || "N/A"}</div>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {cand.targetPosition}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-muted-foreground">
                    {cand.experienceLevel}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <Badge variant="outline" className="text-[10px] font-bold border-border">
                      {cand.currentStage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                    {cand.interviewScore > 0 ? `${cand.interviewScore} / 100` : "Pending Evaluation"}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <Button variant="outline" size="sm" className="h-7 text-[11px]">
                      Advance Stage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateRequisitionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newCand) => setCandidates((prev) => [newCand, ...prev])}
      />
    </div>
  );
}
