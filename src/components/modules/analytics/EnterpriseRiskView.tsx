"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import { analyticsApi, EnterpriseRisk } from "@/services/analyticsApi";

export function EnterpriseRiskView() {
  const [risks, setRisks] = useState<EnterpriseRisk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
          icon={ShieldAlert}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
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
                let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                if (r.riskLevel === "Medium") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                } else if (r.riskLevel === "High / Critical") {
                  badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
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
      )}
    </div>
  );
}
