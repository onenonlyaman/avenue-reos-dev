"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { RecordFormModal, RecordField } from "@/components/core/RecordFormModal";
import { Camera, ShieldAlert, Users, Clock, AlertCircle, Loader2, RefreshCw, Plus } from "lucide-react";
import { aiIntelligenceApi, SafetyConstructionInsight } from "@/services/aiIntelligenceApi";

const SAFETY_FIELDS: RecordField[] = [
  {
    name: "cameraLocation",
    label: "CCTV Camera Location / Site Sector",
    type: "text",
    required: true,
    placeholder: "e.g. Tower B - 8th Floor Slab Casting",
  },
  {
    name: "incidentType",
    label: "Incident / Observation Type",
    type: "select",
    required: true,
    options: [
      { value: "Missing Safety Helmet", label: "Missing Safety Helmet / PPE" },
      { value: "Harness Violation", label: "Harness Violation at Height" },
      { value: "Labor Understaffing", label: "Labor Understaffing vs Schedule" },
      { value: "Perimeter Breach", label: "Perimeter Breach / Unauthorized Zone" },
      { value: "Excavation Shoring Hazard", label: "Excavation Shoring Hazard" },
    ],
  },
  {
    name: "riskSeverity",
    label: "Risk Severity Level",
    type: "select",
    required: true,
    options: [
      { value: "MODERATE", label: "MODERATE" },
      { value: "HIGH", label: "HIGH" },
      { value: "CRITICAL", label: "CRITICAL" },
    ],
    halfWidth: true,
  },
  {
    name: "laborCount",
    label: "Active Labor Count",
    type: "number",
    placeholder: "e.g. 18",
    halfWidth: true,
  },
  {
    name: "projectedScheduleDelayDays",
    label: "Projected Schedule Delay (Days)",
    type: "number",
    placeholder: "e.g. 2",
    halfWidth: true,
  },
];

export function ConstructionSafetyAiView() {
  const [safety, setSafety] = useState<SafetyConstructionInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await aiIntelligenceApi.getConstructionSafety();
      setSafety(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Construction safety insights could not be loaded");
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
        <span>Ingesting site CCTV safety video streams and calculating labor density delays...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Safety AI Engine Unreachable"
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
          <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-800 animate-pulse" />
            CCTV Computer Vision Site Safety & Labor Density Advisor
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated visual hazard detection, PPE adherence monitoring, and labor attendance verification across active sites.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Log Safety Observation
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={loadData}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Streams
          </Button>
        </div>
      </div>

      {safety.length === 0 ? (
        <CorporateEmptyState
          title="No CCTV Safety Violations or Delays Flagged"
          description="Site camera feeds show 100% safety compliance across active project sites. No labor understaffing or schedule variance detected."
          actionLabel="Log Safety Observation"
          onAction={() => setIsCreateModalOpen(true)}
          icon={Camera}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Camera Stream Location</TableHead>
                <TableHead className="text-xs font-semibold">Flagged Safety Incident</TableHead>
                <TableHead className="text-xs font-semibold">Risk Severity</TableHead>
                <TableHead className="text-xs font-semibold text-center">Site Labor Count</TableHead>
                <TableHead className="text-xs font-semibold text-center">Projected Delay</TableHead>
                <TableHead className="text-xs font-semibold text-right">Detection Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safety.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {s.cameraLocation}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                      <span>{s.incidentType}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {s.riskSeverity === "CRITICAL" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                        CRITICAL
                      </Badge>
                    ) : s.riskSeverity === "HIGH" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                        HIGH
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-medium border-border">
                        MODERATE
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{s.laborCount} Workers</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                    {s.projectedScheduleDelayDays > 0 ? (
                      <span className="text-red-800 flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-red-700" />
                        +{s.projectedScheduleDelayDays} Days
                      </span>
                    ) : (
                      <span className="text-emerald-800">On Schedule</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono text-muted-foreground">
                    {new Date(s.timestamp).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RecordFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={loadData}
        title="Log Site Safety / Labor Anomaly Observation"
        endpoint="/api/v1/ai-intelligence/construction-safety"
        fields={SAFETY_FIELDS}
        submitLabel="Record Safety Observation"
        contextNote="Saves observation into the live construction safety stream with tenant isolation."
      />
    </div>
  );
}
