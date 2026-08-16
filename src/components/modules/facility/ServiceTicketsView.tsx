"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Wrench, AlertCircle, Loader2, Plus, RefreshCw, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { facilityApi, MaintenanceTicket } from "@/services/facilityApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";

export function ServiceTicketsView() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      await facilityApi.updateTicketStatus(id, newStatus);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ticket status could not be updated");
    } finally {
      setUpdatingId(null);
    }
  };

  const openTickets = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressTickets = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED").length;
  const slaBreachCount = tickets.filter((t) => t.slaStatus === "SLA Breach" || t.slaStatus === "SLA Warning").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Facility Maintenance Helpdesk & SLA Engine
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time tracking of tenant maintenance requests, repairs, and contractor SLAs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 text-xs font-medium gap-1.5" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Log Service Request
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 font-medium"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Open Service Requests"
          value={`${openTickets} Open`}
          subtext="Awaiting contractor dispatch"
          icon={Clock}
          trend={openTickets > 0 ? "Action Required" : "All Clear"}
          trendDirection={openTickets > 0 ? "down" : "up"}
        />

        <CorporateStatCard
          label="In Active Rectification"
          value={`${inProgressTickets} Work Orders`}
          subtext="Contractor on-site execution"
          icon={Wrench}
          trend="In Progress"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="SLA Compliance Alerts"
          value={`${slaBreachCount} Alerts`}
          subtext="Breaches and nearing deadlines"
          icon={ShieldAlert}
          trend={slaBreachCount > 0 ? "Breach Warning" : "100% On-Track"}
          trendDirection={slaBreachCount > 0 ? "down" : "up"}
        />

        <CorporateStatCard
          label="Resolved Maintenance"
          value={`${resolvedTickets} Closed`}
          subtext="Sign-off verified by residents"
          icon={CheckCircle2}
          trend="Completed"
          trendDirection="up"
        />
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
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
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
                } else if (t.priority === "High") {
                  priorityBadgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                }

                let statusBadgeStyle = "bg-slate-100 text-slate-800 border-slate-300";
                if (t.status === "OPEN") {
                  statusBadgeStyle = "bg-blue-100 text-blue-800 border-blue-300";
                } else if (t.status === "IN_PROGRESS") {
                  statusBadgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                } else if (t.status === "RESOLVED") {
                  statusBadgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                }

                const isUpdating = updatingId === t.id;

                return (
                  <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      <div className="font-semibold">{t.ticketSummary}</div>
                      <span className="text-[10px] text-muted-foreground font-mono">Ref: {t.ticketReference} • {t.loggedDate}</span>
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
                      {t.assignedContractor || "Unassigned"}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-mono font-bold ${statusBadgeStyle}`}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status === "OPEN" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] px-2 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                            onClick={() => handleStatusChange(t.id, "IN_PROGRESS")}
                            disabled={isUpdating}
                          >
                            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Start Work"}
                          </Button>
                        )}
                        {t.status === "IN_PROGRESS" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] px-2 border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                            onClick={() => handleStatusChange(t.id, "RESOLVED")}
                            disabled={isUpdating}
                          >
                            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Resolve"}
                          </Button>
                        )}
                        {t.status === "RESOLVED" && (
                          <span className="text-[10px] text-emerald-700 font-medium">Closed</span>
                        )}
                      </div>
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
