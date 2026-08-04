"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { KeyRound, CheckCircle2, ShieldCheck, Plus, AlertCircle, Loader2 } from "lucide-react";
import { facilityApi, UnitHandover } from "@/services/facilityApi";
import { ScheduleHandoverModal } from "./ScheduleHandoverModal";

export function HandoverPossessionView() {
  const [handovers, setHandovers] = useState<UnitHandover[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await facilityApi.getHandovers();
      setHandovers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Possession handovers could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const readyCount = handovers.filter((h) => h.status === "READY_FOR_HANDOVER").length;
  const inDesnaggingCount = handovers.filter((h) => h.status === "IN_DESNAGGING").length;
  const nocClearedCount = handovers.filter((h) => h.financialNocCleared).length;
  const handedOverCount = handovers.filter((h) => h.status === "HANDED_OVER").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Buyer Possession & De-Snagging Matrix
          </h3>
        </div>

        <Button
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium shrink-0"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Schedule Possession Inspection
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Units Ready for Possession"
          value={`${readyCount} Units`}
          subtext="100% De-snagged and NOC cleared"
          icon={KeyRound}
          trend="Clearance Ready"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Pending De-Snag Items"
          value={`${inDesnaggingCount} Units`}
          subtext="In active punch-list rectification"
          icon={AlertCircle}
          trend={inDesnaggingCount > 0 ? "In Rectification" : "All Rectified"}
          trendDirection={inDesnaggingCount > 0 ? "neutral" : "up"}
        />

        <CorporateStatCard
          label="Financial NOC Clearances"
          value={`${nocClearedCount} Cleared`}
          subtext="Finance ERP dues fully settled"
          icon={ShieldCheck}
          trend="Ledger Settled"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Handed Over Units"
          value={`${handedOverCount} Completed`}
          subtext="Keys formally handed to buyers"
          icon={CheckCircle2}
          trend="Completed"
          trendDirection="neutral"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading possession handovers...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Possession Ledger Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : handovers.length === 0 ? (
        <CorporateEmptyState
          title="No Possession Handover Records Found"
          description="No possession inspections or handover clearances on record."
          actionLabel="Schedule Possession Inspection"
          onAction={() => setIsModalOpen(true)}
          icon={KeyRound}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Property Development Unit</TableHead>
                <TableHead className="text-xs font-semibold">Buyer Name</TableHead>
                <TableHead className="text-xs font-semibold text-center">De-Snagging Completion %</TableHead>
                <TableHead className="text-xs font-semibold text-center">Financial NOC Clearance</TableHead>
                <TableHead className="text-xs font-semibold text-center">Target Handover Date</TableHead>
                <TableHead className="text-xs font-semibold text-center">Possession Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {handovers.map((h) => {
                let badgeStyle = "bg-slate-100 text-slate-800 border-slate-300";
                let statusText = "Pending";

                if (h.status === "READY_FOR_HANDOVER") {
                  badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                  statusText = "Ready for Possession";
                } else if (h.status === "IN_DESNAGGING") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                  statusText = "In De-snagging";
                } else if (h.status === "PENDING_APPROVAL") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                  statusText = "Pending Director Override";
                } else if (h.status === "HANDED_OVER") {
                  badgeStyle = "bg-blue-100 text-blue-800 border-blue-300";
                  statusText = "Handed Over";
                }

                return (
                  <TableRow key={h.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      <div>{h.unitName}</div>
                      <span className="text-[10px] text-muted-foreground font-mono">Ref: {h.handoverReference}</span>
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {h.buyerName}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono font-bold">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-foreground">{h.desnaggingCompletionPct}%</span>
                        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${Math.min(100, h.desnaggingCompletionPct)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      {h.financialNocCleared ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          NOC Issued (₹0 Balance)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                          Dues Pending (₹{h.outstandingBalance.toLocaleString("en-IN")})
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                      {h.targetHandoverDate}
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

      <ScheduleHandoverModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onHandoverScheduled={loadData}
      />
    </div>
  );
}
