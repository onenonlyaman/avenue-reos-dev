"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Award, GraduationCap, Target, AlertCircle, Loader2, Plus } from "lucide-react";
import { hrApi, PerformanceGoal } from "@/services/hrApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";

export function PerformanceTrainingView() {
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [filterMode, setFilterMode] = useState<"ALL" | "TRAINEE" | "OKRS">("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await hrApi.getPerformance();
      setGoals(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Performance goals could not be loaded");
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
        <span>Loading performance OKRs and trainee skill acquisition analytics...</span>
      </div>
    );
  }

  if (error && goals.length === 0) {
    return (
      <CorporateEmptyState
        title="Performance Analytics Unreachable"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  const filteredGoals = goals.filter((g) => {
    if (filterMode === "TRAINEE") return g.isTrainee;
    if (filterMode === "OKRS") return !g.isTrainee;
    return true;
  });

  const traineeCount = goals.filter((g) => g.isTrainee).length;
  const okrCount = goals.filter((g) => !g.isTrainee).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Departmental OKRs & Trainee Performance Analytics Engine
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key results, site apprentice evaluation milestones, and organizational objectives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-semibold gap-1.5"
            onClick={() => setIsRecordFormOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Set Objective
          </Button>

          <div className="flex items-center gap-1 bg-muted p-1 rounded border border-border">
            <Button
              variant={filterMode === "ALL" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilterMode("ALL")}
            >
              <Target className="mr-1 h-3 w-3" />
              All ({goals.length})
            </Button>

            <Button
              variant={filterMode === "TRAINEE" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilterMode("TRAINEE")}
            >
              <GraduationCap className="mr-1 h-3 w-3" />
              Trainees ({traineeCount})
            </Button>

            <Button
              variant={filterMode === "OKRS" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilterMode("OKRS")}
            >
              <Award className="mr-1 h-3 w-3" />
              OKRs ({okrCount})
            </Button>
          </div>
        </div>
      </div>

      {filteredGoals.length === 0 ? (
        <CorporateEmptyState
          title={filterMode === "TRAINEE" ? "No Active Trainee Records" : "No Performance Records Found"}
          description={
            filterMode === "TRAINEE"
              ? "No active trainee skill evaluation records found for current apprentices."
              : "No active departmental goals or performance reviews recorded."
          }
          actionLabel="Set Objective"
          onAction={() => setIsRecordFormOpen(true)}
          icon={Award}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Employee / Apprentice Name</TableHead>
                  <TableHead className="text-xs font-semibold">Category & Department</TableHead>
                  <TableHead className="text-xs font-semibold">Target Milestone / OKR</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Score Progress</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Evaluation Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGoals.map((g) => {
                  const pct = g.targetScore > 0 ? Math.min(100, Math.round((g.achievedScore / g.targetScore) * 100)) : 0;
                  return (
                    <TableRow key={g.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs py-3 font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          {g.isTrainee && <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />}
                          <span>{g.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3 font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] border-border">
                            {g.isTrainee ? "Site Trainee Apprentice" : "Permanent Staff"}
                          </Badge>
                          <span className="text-muted-foreground">{g.department}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3 font-medium text-foreground">
                        {g.title}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                        {g.achievedScore} / {g.targetScore} ({pct}%)
                      </TableCell>
                      <TableCell className="text-xs py-3 text-center">
                        {g.status === "ON_TRACK" || g.status === "COMPLETED" ? (
                          <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                            {g.status}
                          </Badge>
                        ) : g.status === "AT_RISK" ? (
                          <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                            AT RISK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                            NEEDS IMPROVEMENT
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <RecordFormModal
        isOpen={isRecordFormOpen}
        onClose={() => setIsRecordFormOpen(false)}
        onSaved={loadData}
        title="Set Performance Objective"
        endpoint="/api/v1/hr/performance"
        submitLabel="Set Objective"
        fields={[
          { name: "employeeName", label: "Employee", type: "text", required: true, halfWidth: true },
          { name: "department", label: "Department", type: "catalog", catalogCategory: "DEPARTMENT", required: true, halfWidth: true },
          { name: "title", label: "Objective", type: "text", required: true },
          { name: "targetScore", label: "Target Score", type: "number", halfWidth: true },
          { name: "achievedScore", label: "Achieved Score", type: "number", halfWidth: true },
          { name: "isTrainee", label: "Apprentice / Trainee", type: "checkbox", halfWidth: true },
        ]}
      />
    </div>
  );
}
