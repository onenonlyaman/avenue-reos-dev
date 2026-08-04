"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ShieldAlert, AlertCircle, Loader2 , Plus } from "lucide-react";
import { legalApi, TitleSearchLog } from "@/services/legalApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";
import { Button } from "@/components/ui/button";

export function TitleLitigationView() {
  const [logs, setLogs] = useState<TitleSearchLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await legalApi.getTitleSearches();
      setLogs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Title search logs could not be loaded");
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
            30-Year Title Search & Encumbrance Audit Register
          </h3>
        </div>
      <Button size="sm" className="h-8 text-xs font-medium gap-1.5" onClick={() => setIsFormOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Record Title Search
      </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading title search records...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Title Audit Register Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : logs.length === 0 ? (
        <CorporateEmptyState
          title="No Title Search Records Found"
          description="No title clearance audits on record."
          actionLabel="Record Title Search"
          onAction={() => setIsFormOpen(true)}
          icon={ShieldAlert}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Survey Number / Parcel</TableHead>
                <TableHead className="text-xs font-semibold">Legal Advocate</TableHead>
                <TableHead className="text-xs font-semibold text-center">Search Period</TableHead>
                <TableHead className="text-xs font-semibold text-center">Encumbrance Status</TableHead>
                <TableHead className="text-xs font-semibold text-center">7/12 Extract Audit</TableHead>
                <TableHead className="text-xs font-semibold text-center">Risk Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => {
                let riskStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                if (l.riskRating === "MEDIUM") {
                  riskStyle = "bg-amber-100 text-amber-800 border-amber-300";
                } else if (l.riskRating === "HIGH") {
                  riskStyle = "bg-rose-100 text-rose-800 border-rose-300";
                }

                return (
                  <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      {l.surveyNumber}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {l.legalAdvocate}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                      {l.searchPeriodYears} Years
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-medium text-foreground">
                      {l.encumbranceStatus}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      {l.extractVerified712 ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          Verified (Clean)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                          Pending Mutation
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-bold ${riskStyle}`}>
                        {l.riskRating} RISK
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
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={loadData}
        title="Record Title Search"
        endpoint="/api/v1/legal/title-searches"
        submitLabel="Record Search"
        fields={[
          { name: "surveyNumber", label: "Survey Number", type: "text", required: true, halfWidth: true },
          { name: "legalAdvocate", label: "Appointed Advocate", type: "text", required: true, halfWidth: true },
          { name: "searchPeriodYears", label: "Search Period (Years)", type: "number", halfWidth: true },
          { name: "encumbranceStatus", label: "Encumbrance Status", type: "select", halfWidth: true, options: [
            { value: "Clear", label: "Clear" },
            { value: "Encumbered", label: "Encumbered" },
            { value: "Under Verification", label: "Under Verification" },
          ] },
          { name: "riskRating", label: "Risk Rating", type: "select", halfWidth: true, options: [
            { value: "LOW", label: "Low" },
            { value: "MEDIUM", label: "Medium" },
            { value: "HIGH", label: "High" },
          ] },
          { name: "extractVerified712", label: "7/12 Extract Verified", type: "checkbox", halfWidth: true },
        ]}
      />
    </div>
  );
}
