"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { HardHat, TrendingUp, Users, Landmark, AlertCircle, Loader2 , Plus } from "lucide-react";
import { constructionApi, WbsMilestone, DailyProgressLog } from "@/services/constructionApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";
import { Button } from "@/components/ui/button";

interface WbsMilestonesViewProps {
  projects: Array<{ id: string; name: string }>;
  selectedProject: string;
  onProjectChange: (project: string) => void;
}

export function WbsMilestonesView({
  projects,
  selectedProject,
  onProjectChange,
}: WbsMilestonesViewProps) {
  const [milestones, setMilestones] = useState<WbsMilestone[]>([]);
  const [dprLogs, setDprLogs] = useState<DailyProgressLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [wbsData, dprData] = await Promise.all([
        constructionApi.getWbsMilestones(selectedProject),
        constructionApi.getDprLogs(selectedProject),
      ]);
      setMilestones(wbsData);
      setDprLogs(dprData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "WBS milestones could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  let overallProgressPct = 0;
  let totalAllocationLakhs = 0;

  if (milestones.length > 0) {
    let weightedSum = 0;
    let totalWeight = 0;
    milestones.forEach((m) => {
      weightedSum += (m.phaseWeightagePct * m.physicalCompletionPct) / 100;
      totalWeight += m.phaseWeightagePct;
      totalAllocationLakhs += m.financialAllocationLakhs;
    });
    overallProgressPct = totalWeight > 0 ? Number(((weightedSum / totalWeight) * 100).toFixed(1)) : 0;
  }

  const activeWorkforce = dprLogs.reduce((sum, log) => sum + (log.totalLaborCount || 0), 0);
  const delayedCount = milestones.filter((m) => m.status === "DELAYED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Work Breakdown Structure & Progress Matrix
          </h3>
        </div>

        
        <Button size="sm" variant="outline" className="h-8 text-xs font-medium gap-1.5" onClick={() => setIsRecordFormOpen(true)}>

          <Plus className="h-3.5 w-3.5" />

          Add Milestone

        </Button>
<div className="w-full sm:w-72 shrink-0">
          <Select value={selectedProject} onValueChange={(val) => val && onProjectChange(val)}>
            <SelectTrigger className="h-9 text-xs w-full">
              <SelectValue placeholder="Select Project Development" />
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Overall Physical Progress"
          value={`${overallProgressPct}%`}
          subtext="Weighted WBS phase completion"
          icon={HardHat}
          trend="On Track"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Schedule Delay Audit"
          value={`${delayedCount} Phase(s)`}
          subtext="Milestones exceeding 7-day target variance"
          icon={TrendingUp}
          trend={delayedCount > 0 ? "Requires Action" : "On Schedule"}
          trendDirection={delayedCount > 0 ? "down" : "up"}
        />

        <CorporateStatCard
          label="Active Site Workforce"
          value={`${activeWorkforce} Active Workers`}
          subtext="Shift headcount logged via DPR"
          icon={Users}
          trend="DPR Verified"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Financial Capital Allocation"
          value={`₹${(totalAllocationLakhs / 100).toFixed(2)} Cr`}
          subtext="Total allocated construction WBS budget"
          icon={Landmark}
          trend="Budget Encumbered"
          trendDirection="up"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading work breakdown milestones...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="WBS Milestone Ledger Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : milestones.length === 0 ? (
        <CorporateEmptyState
          title="No Construction WBS Milestones Found"
          description="There are currently no active WBS execution phases logged for the selected project site."
          icon={HardHat}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Execution Phase</TableHead>
                <TableHead className="text-xs font-semibold">Milestone Title</TableHead>
                <TableHead className="text-xs font-semibold">Target Start / Completion</TableHead>
                <TableHead className="text-xs font-semibold text-center">Physical Completion %</TableHead>
                <TableHead className="text-xs font-semibold">Assigned Contractor</TableHead>
                <TableHead className="text-xs font-semibold text-right">Financial Allocation (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.map((m) => {
                let badgeStyle = "bg-slate-100 text-slate-800 border-slate-300";
                let statusText = "Pending";

                if (m.status === "COMPLETED") {
                  badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                  statusText = "Completed";
                } else if (m.status === "IN_PROGRESS") {
                  badgeStyle = "bg-blue-100 text-blue-800 border-blue-300";
                  statusText = "In Progress";
                } else if (m.status === "DELAYED") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                  statusText = "Delayed";
                }

                return (
                  <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      <div>{m.executionPhase}</div>
                      <span className="text-[10px] text-muted-foreground font-mono">Code: {m.milestoneCode}</span>
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {m.milestoneTitle}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                      <div>Start: {m.targetStartDate}</div>
                      <div>End: {m.targetCompletionDate}</div>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono font-bold">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-foreground">{m.physicalCompletionPct}%</span>
                        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${Math.min(100, m.physicalCompletionPct)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {m.assignedContractor}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                      ₹{m.financialAllocationLakhs.toFixed(2)} Lakhs
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

      <RecordFormModal
        isOpen={isRecordFormOpen}
        onClose={() => setIsRecordFormOpen(false)}
        onSaved={loadData}
        title="Add Work Breakdown Milestone"
        endpoint="/api/v1/construction/wbs"
        submitLabel="Add Milestone"
        transform={(vals) => ({
          ...vals,
          phaseWeightagePct: vals.phaseWeightagePct ? parseFloat(String(vals.phaseWeightagePct)) : 0,
          financialAllocationLakhs: vals.financialAllocationLakhs ? parseFloat(String(vals.financialAllocationLakhs)) : 0,
        })}
        fields={[
          {
            name: "projectId",
            label: "Development Project",
            type: "select",
            required: true,
            options: projects.filter((p) => p.id !== "all").map((p) => ({ value: p.id, label: p.name })),
          },
          { name: "milestoneCode", label: "Milestone Reference", type: "text", required: true, halfWidth: true, placeholder: "e.g. WBS-SUB-01" },
          { name: "executionPhase", label: "Execution Phase", type: "text", required: true, halfWidth: true, placeholder: "e.g. Substructure & Foundation" },
          { name: "milestoneTitle", label: "Milestone Title", type: "text", required: true, placeholder: "e.g. Raft Foundation Concrete Pouring" },
          { name: "assignedContractor", label: "Assigned Contractor", type: "text", required: true, halfWidth: true, placeholder: "e.g. Apex Civil Infra" },
          { name: "phaseWeightagePct", label: "Phase Weightage (%)", type: "number", halfWidth: true, placeholder: "e.g. 20" },
          { name: "targetStartDate", label: "Target Start", type: "date", required: true, halfWidth: true },
          { name: "targetCompletionDate", label: "Target Completion", type: "date", required: true, halfWidth: true },
          { name: "financialAllocationLakhs", label: "Allocation (₹ Lakhs)", type: "number", halfWidth: true, placeholder: "e.g. 45.00" },
        ]}
      />
    </div>
  );
}

