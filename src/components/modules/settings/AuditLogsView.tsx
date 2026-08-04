"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { FileText, AlertCircle, Loader2 } from "lucide-react";
import { settingsApi, AuditTrailLog } from "@/services/settingsApi";

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditTrailLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsApi.getAuditLogs();
      setLogs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Audit trail logs could not be loaded");
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
            Immutable Enterprise Security & Financial Audit Trail Engine
          </h3>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading audit trail...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Audit Ledger Register Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : logs.length === 0 ? (
        <CorporateEmptyState
          title="No Security Audit Logs Found"
          description="No audit trail entries on record."
          icon={FileText}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">UTC Timestamp</TableHead>
                <TableHead className="text-xs font-semibold">Performing Officer</TableHead>
                <TableHead className="text-xs font-semibold">Module Executed</TableHead>
                <TableHead className="text-xs font-semibold text-center">Action Type</TableHead>
                <TableHead className="text-xs font-semibold">Target Entity / Details</TableHead>
                <TableHead className="text-xs font-semibold text-center">IP Address</TableHead>
                <TableHead className="text-xs font-semibold text-center">Verification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => {
                let badgeStyle = "bg-slate-100 text-slate-800 border-slate-300";
                if (l.actionType === "Update") {
                  badgeStyle = "bg-blue-100 text-blue-800 border-blue-300";
                } else if (l.actionType === "Financial Approval") {
                  badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                } else if (l.actionType === "HITL Override") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                }

                return (
                  <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                      {l.timestamp}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      {l.officerName}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {l.moduleExecuted}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-bold ${badgeStyle}`}>
                        {l.actionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-foreground font-medium">
                      {l.targetDescription}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                      {l.ipAddress}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono">
                      {l.securityVerified ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          WORM Signed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold bg-rose-100 text-rose-800 border-rose-300">
                          Unverified
                        </Badge>
                      )}
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
