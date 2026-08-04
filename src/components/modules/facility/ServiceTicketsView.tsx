"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Wrench, AlertCircle, Loader2 , Plus } from "lucide-react";
import { facilityApi, MaintenanceTicket } from "@/services/facilityApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";
import { Button } from "@/components/ui/button";

export function ServiceTicketsView() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await facilityApi.getTickets();
      setTickets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Maintenance tickets could not be loaded");
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
            Facility Maintenance Helpdesk & SLA Engine
          </h3>
        </div>
      <Button size="sm" className="h-8 text-xs font-medium gap-1.5" onClick={() => setIsFormOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Log Service Request
      </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading service tickets...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Service Ticket Ledger Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : tickets.length === 0 ? (
        <CorporateEmptyState
          title="No Open Service Tickets Found"
          description="No maintenance or repair requests logged."
          actionLabel="Log Service Request"
          onAction={() => setIsFormOpen(true)}
          icon={Wrench}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Ticket Summary</TableHead>
                <TableHead className="text-xs font-semibold">Property Location</TableHead>
                <TableHead className="text-xs font-semibold">Category</TableHead>
                <TableHead className="text-xs font-semibold text-center">Priority</TableHead>
                <TableHead className="text-xs font-semibold text-center">SLA Compliance</TableHead>
                <TableHead className="text-xs font-semibold">Assigned Contractor</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t) => {
                let slaBadgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                if (t.slaStatus === "SLA Warning") {
                  slaBadgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                } else if (t.slaStatus === "SLA Breach") {
                  slaBadgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                }

                let priorityBadgeStyle = "bg-slate-100 text-slate-800 border-slate-300";
                if (t.priority === "Critical") {
                  priorityBadgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                } else if (t.priority === "Moderate") {
                  priorityBadgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                }

                return (
                  <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      <div>{t.ticketSummary}</div>
                      <span className="text-[10px] text-muted-foreground font-mono">Ref: {t.ticketReference}</span>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {t.propertyLocation}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {t.category}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-bold ${priorityBadgeStyle}`}>
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-bold ${slaBadgeStyle}`}>
                        {t.slaStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {t.assignedContractor}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                        {t.status}
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
        title="Log Maintenance Request"
        endpoint="/api/v1/facility/tickets"
        submitLabel="Log Request"
        fields={[
          { name: "ticketSummary", label: "Request Summary", type: "text", required: true },
          { name: "propertyLocation", label: "Property / Unit", type: "text", required: true, halfWidth: true },
          { name: "category", label: "Category", type: "catalog", catalogCategory: "TICKET_CATEGORY", required: true, halfWidth: true },
          { name: "priority", label: "Priority", type: "select", halfWidth: true, options: [
            { value: "Moderate", label: "Moderate" },
            { value: "High", label: "High" },
            { value: "Critical", label: "Critical" },
          ] },
          { name: "assignedContractor", label: "Assigned Contractor", type: "text", halfWidth: true },
        ]}
      />
    </div>
  );
}
