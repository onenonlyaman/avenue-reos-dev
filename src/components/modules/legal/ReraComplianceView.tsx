"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { FileCheck, AlertCircle, Loader2 , Plus } from "lucide-react";
import { legalApi, ReraCompliance } from "@/services/legalApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";
import { Button } from "@/components/ui/button";

export function ReraComplianceView() {
  const [reraList, setReraList] = useState<ReraCompliance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await legalApi.getReraRecords();
      setReraList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "MahaRERA compliance records could not be loaded");
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
            MahaRERA Statutory Compliance & 70% Escrow Audit Engine
          </h3>
        </div>
      <Button size="sm" className="h-8 text-xs font-medium gap-1.5" onClick={() => setIsFormOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        File Registration
      </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading MahaRERA compliance records...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="MahaRERA Register Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : reraList.length === 0 ? (
        <CorporateEmptyState
          title="No MahaRERA Project Compliance Records Found"
          description="No MahaRERA registrations filed."
          actionLabel="File Registration"
          onAction={() => setIsFormOpen(true)}
          icon={FileCheck}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Project Name</TableHead>
                <TableHead className="text-xs font-semibold">MahaRERA Reg Reference</TableHead>
                <TableHead className="text-xs font-semibold text-center">Quarterly Filing</TableHead>
                <TableHead className="text-xs font-semibold text-right">70% Escrow Balance (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Form 1/2/3 Certificates</TableHead>
                <TableHead className="text-xs font-semibold text-center">Audit Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reraList.map((r) => {
                let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                if (r.certificateAuditStatus === "Pending Certification") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                } else if (r.certificateAuditStatus === "Overdue Filing") {
                  badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                }

                return (
                  <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      {r.projectName}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                      {r.reraRegReference}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                      {r.quarterlyReturnStatus}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-primary text-sm">
                      ₹{r.escrowBalanceLakhs.toFixed(2)} Lakhs
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono">
                      <div className="flex items-center justify-center gap-1.5 text-[11px]">
                        <span className={r.form1Status ? "text-emerald-800 font-bold" : "text-muted-foreground"}>F1</span>
                        <span>•</span>
                        <span className={r.form2Status ? "text-emerald-800 font-bold" : "text-muted-foreground"}>F2</span>
                        <span>•</span>
                        <span className={r.form3Status ? "text-emerald-800 font-bold" : "text-muted-foreground"}>F3</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-bold ${badgeStyle}`}>
                        {r.certificateAuditStatus}
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
        title="Record MahaRERA Registration"
        endpoint="/api/v1/legal/rera"
        submitLabel="Record Registration"
        fields={[
          { name: "projectName", label: "Development", type: "text", required: true },
          { name: "reraRegReference", label: "MahaRERA Reference", type: "text", required: true, halfWidth: true },
          { name: "escrowBalanceLakhs", label: "Escrow Balance (₹ Lakhs)", type: "number", halfWidth: true },
          { name: "quarterlyReturnStatus", label: "Quarterly Return", type: "select", halfWidth: true, options: [
            { value: "COMPLIANT", label: "Compliant" },
            { value: "PENDING", label: "Pending" },
            { value: "OVERDUE", label: "Overdue" },
          ] },
          { name: "certificateAuditStatus", label: "Audit Certificate", type: "select", halfWidth: true, options: [
            { value: "Compliant", label: "Compliant" },
            { value: "Under Review", label: "Under Review" },
            { value: "Lapsed", label: "Lapsed" },
          ] },
          { name: "form1Status", label: "Form 1 Certified", type: "checkbox", halfWidth: true },
          { name: "form2Status", label: "Form 2 Certified", type: "checkbox", halfWidth: true },
          { name: "form3Status", label: "Form 3 Certified", type: "checkbox", halfWidth: true },
        ]}
      />
    </div>
  );
}
