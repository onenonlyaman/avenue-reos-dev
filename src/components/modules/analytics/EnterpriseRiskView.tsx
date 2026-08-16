"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { RecordFormModal, RecordField } from "@/components/core/RecordFormModal";
import { ShieldAlert, AlertCircle, Loader2, Plus, RefreshCw } from "lucide-react";
import { analyticsApi, EnterpriseRisk } from "@/services/analyticsApi";

const RISK_FIELDS: RecordField[] = [
  {
    name: "riskCategory",
    label: "Risk Vector Category",
    type: "select",
    required: true,
    options: [
      { value: "Statutory & RERA Compliance", label: "Statutory & RERA Compliance" },
      { value: "Contractual & Vendor Default", label: "Contractual & Vendor Default" },
      { value: "Market Liquidity & Collections", label: "Market Liquidity & Collections" },
      { value: "Safety & Environmental Hazard", label: "Safety & Environmental Hazard" },
      { value: "Structural Execution Delay", label: "Structural Execution Delay" },
    ],
  },
  {
    name: "associatedProjectSite",
    label: "Associated Project / Development Site",
    type: "text",
    required: true,
    placeholder: "e.g. Avenue Grandeur (Gangapur Road)",
  },
  {
    name: "impactRating",
    label: "Impact Severity Rating",
    type: "select",
    required: true,
    options: [
      { value: "LOW", label: "LOW" },
      { value: "MEDIUM", label: "MEDIUM" },
      { value: "HIGH", label: "HIGH" },
      { value: "CRITICAL", label: "CRITICAL" },
    ],
    halfWidth: true,
  },
  {
    name: "riskLevel",
    label: "Portfolio Risk Level",
    type: "select",
    required: true,
    options: [
      { value: "Low", label: "Low" },
      { value: "Medium", label: "Medium" },
      { value: "High / Critical", label: "High / Critical" },
    ],
    halfWidth: true,
  },
  {
    name: "riskVectorSummary",
    label: "Risk Exposure & Threat Summary",
    type: "textarea",
    required: true,
    placeholder: "e.g. Environmental clearances pending for Tower C foundation dewatering.",
  },
  {
    name: "mitigationActionPlan",
    label: "Mitigation Action Plan & Contingency Control",
    type: "textarea",
    required: true,
    placeholder: "e.g. Expedited fast-track NOC hearing scheduled with municipal compliance board.",
  },
];

export function EnterpriseRiskView() {
  const [risks, setRisks] = useState<EnterpriseRisk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await analyticsApi.getRiskMatrix();
      setRisks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Risk matrix could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Cross-Departmental Enterprise Risk Index Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational risk vectors, statutory compliance tracking, and mitigation controls.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Log Enterprise Risk
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={loadData}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Matrix
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading risk register...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Risk Register Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : risks.length === 0 ? (
        <CorporateEmptyState
          title="No Enterprise Risk Exposure Flagged"
          description="There are currently no high-risk operational or compliance variances recorded in the portfolio."
          actionLabel="Log Enterprise Risk"
          onAction={() => setIsCreateModalOpen(true)}
          icon={ShieldAlert}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Risk Vector Category</TableHead>
                  <TableHead className="text-xs font-semibold">Associated Project Site</TableHead>
                  <TableHead className="text-xs font-semibold">Risk Exposure Summary</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Impact Rating</TableHead>
                  <TableHead className="text-xs font-semibold">Mitigation Action Plan</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((r) => {
                  let badgeStyle = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
                  if (r.riskLevel === "Medium") {
                    badgeStyle = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
                  } else if (r.riskLevel === "High / Critical") {
                    badgeStyle = "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
                  }

                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs py-3 font-semibold text-foreground">
                        {r.riskCategory}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-muted-foreground">
                        {r.associatedProjectSite}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-foreground font-medium">
                        {r.riskVectorSummary}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-center font-mono font-bold">
                        {r.impactRating}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-muted-foreground">
                        {r.mitigationActionPlan}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-center">
                        <Badge variant="outline" className={`text-[10px] font-bold ${badgeStyle}`}>
                          {r.riskLevel}
                        </Badge>
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
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={loadData}
        title="Log Enterprise Risk / Operational Threat"
        endpoint="/api/v1/analytics/risk"
        fields={RISK_FIELDS}
        submitLabel="Record Enterprise Risk"
        contextNote="Registers cross-functional risk into the portfolio oversight register."
      />
    </div>
  );
}
