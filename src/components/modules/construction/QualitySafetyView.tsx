"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ShieldCheck, AlertCircle, Loader2 , Plus } from "lucide-react";
import { constructionApi, QualitySafetyInspection } from "@/services/constructionApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";
import { Button } from "@/components/ui/button";

interface QualitySafetyViewProps {
  projects: Array<{ id: string; name: string }>;
  selectedProject: string;
  onProjectChange: (project: string) => void;
}

export function QualitySafetyView({
  projects,
  selectedProject,
  onProjectChange,
}: QualitySafetyViewProps) {
  const [inspections, setInspections] = useState<QualitySafetyInspection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadInspections = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await constructionApi.getInspections(selectedProject);
      setInspections(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Quality and safety audits could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, [selectedProject]);

  return (
    <div className="space-y-4">
      <div className="bg-card text-card-foreground p-4 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Structural Quality Control & Site Safety Audit Ledger
          </h3>
        </div>

        
        <Button size="sm" variant="outline" className="h-8 text-xs font-medium gap-1.5" onClick={() => setIsRecordFormOpen(true)}>

          <Plus className="h-3.5 w-3.5" />

          Log Inspection

        </Button>
<div className="w-full sm:w-64 shrink-0">
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
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading inspection records...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Inspection Records Unavailable"
          description={error}
          actionLabel="Retry"
          onAction={loadInspections}
          icon={AlertCircle}
        />
      ) : inspections.length === 0 ? (
        <CorporateEmptyState
          title="No Quality or Safety Audits Found"
          description="There are currently no structural quality test results or safety violation logs recorded for the selected site."
          icon={ShieldCheck}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Inspection Date</TableHead>
                <TableHead className="text-xs font-semibold">Site Location</TableHead>
                <TableHead className="text-xs font-semibold">Audit Category</TableHead>
                <TableHead className="text-xs font-semibold">Inspecting Engineer</TableHead>
                <TableHead className="text-xs font-semibold">Remarks & Findings</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status Badge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map((insp) => {
                let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                let statusText = "Passed Compliance";

                if (insp.status === "VIOLATION_FLAGGED") {
                  badgeStyle = "bg-red-100 text-red-800 border-red-300";
                  statusText = "Violation Flagged";
                } else if (insp.status === "RESOLVED") {
                  badgeStyle = "bg-blue-100 text-blue-800 border-blue-300";
                  statusText = "Resolved & Cleared";
                }

                return (
                  <TableRow key={insp.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs py-3 font-semibold text-foreground">
                      {insp.inspectionDate}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {insp.siteLocation}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground font-medium">
                      {insp.category}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-foreground">
                      {insp.inspectingEngineer}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground max-w-xs truncate">
                      {insp.remarks || "No defects reported."}
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
        onSaved={loadInspections}
        title="Log Quality Inspection"
        endpoint="/api/v1/construction/inspections"
        submitLabel="Log Inspection"
        fields={[
          {
            name: "projectId",
            label: "Development Project Site",
            type: "select",
            required: true,
            options: projects.filter((p) => p.id !== "all").map((p) => ({ value: p.id, label: p.name })),
          },
          { name: "ncrNumber", label: "Report Reference", type: "text", halfWidth: true, placeholder: "e.g. NCR-00912" },
          { name: "defectSeverity", label: "Defect Severity", type: "select", required: true, halfWidth: true, options: [
            { value: "MINOR", label: "Minor" },
            { value: "MAJOR", label: "Major" },
            { value: "CRITICAL", label: "Critical" },
          ] },
          { name: "inspectorName", label: "Inspecting Engineer", type: "text", halfWidth: true, placeholder: "e.g. Suresh Patil" },
          { name: "contractorName", label: "Contractor", type: "text", halfWidth: true, placeholder: "e.g. Apex Civil Works" },
          { name: "description", label: "Observation & Defect Description", type: "textarea", required: true, placeholder: "Describe concrete compaction, reinforcement tie, or safety breach..." },
          { name: "correctiveAction", label: "Mandatory Corrective Action", type: "textarea", placeholder: "Specify remediation timeline and rectification measures..." },
        ]}
      />
    </div>
  );
}


