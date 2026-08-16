"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import {
  Headset,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  PlusCircle,
  AlertCircle,
  Loader2,
  Clock,
  User,
  Building,
  DollarSign,
} from "lucide-react";
import { communicationsApi, SupportTicket } from "@/services/communicationsApi";
import { CreateTicketModal } from "./CreateTicketModal";

export function SupportDeskView() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "ESCALATED" | "RESOLVED">("ALL");

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await communicationsApi.getTickets();
      setTickets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Support tickets could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (newStatus: "OPEN" | "IN_PROGRESS" | "RESOLVED") => {
    if (!selectedTicket) return;
    try {
      setIsUpdatingStatus(true);
      const updated = await communicationsApi.updateTicketStatus(selectedTicket.id, newStatus);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTicket(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update ticket status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading support desk tickets and SLA tracking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Support Desk Service Unreachable"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  const openCount = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const slaRiskCount = tickets.filter((t) => t.slaStatus === "AT_RISK" || t.slaStatus === "BREACHED").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;
  const legalCount = tickets.filter((t) => t.category === "Legal Notice" || t.requiresHitl).length;

  const filteredTickets = tickets.filter((t) => {
    if (activeFilter === "ACTIVE") return t.status === "OPEN" || t.status === "IN_PROGRESS";
    if (activeFilter === "ESCALATED") return t.requiresHitl || t.category === "Legal Notice";
    if (activeFilter === "RESOLVED") return t.status === "RESOLVED";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Omnichannel Customer Support Desk & SLA Management
          </h3>
        </div>

        <Button size="sm" className="gap-1.5 text-xs font-semibold shrink-0" onClick={() => setIsModalOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Raise Support Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Active Open Tickets"
          value={openCount.toString()}
          subtext="Pending Resolution"
          icon={Headset}
          trend={`${tickets.length} Total Ingested`}
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="SLA Breach Risk"
          value={slaRiskCount.toString()}
          subtext="Response Threshold > 24h"
          icon={AlertTriangle}
          trend="Escalation Risk"
          trendDirection={slaRiskCount > 0 ? "down" : "up"}
        />

        <CorporateStatCard
          label="Resolved Tickets"
          value={resolvedCount.toString()}
          subtext="Closed Inquiries"
          icon={CheckCircle2}
          trend="Customer Satisfaction"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Pending Legal Escalations"
          value={legalCount.toString()}
          subtext="Requires HITL Review"
          icon={ShieldAlert}
          trend="Financial & Legal Risk"
          trendDirection={legalCount > 0 ? "down" : "up"}
        />
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Button
          variant={activeFilter === "ALL" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold"
          onClick={() => setActiveFilter("ALL")}
        >
          All Tickets ({tickets.length})
        </Button>
        <Button
          variant={activeFilter === "ACTIVE" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold"
          onClick={() => setActiveFilter("ACTIVE")}
        >
          Active ({openCount})
        </Button>
        <Button
          variant={activeFilter === "ESCALATED" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold text-amber-800"
          onClick={() => setActiveFilter("ESCALATED")}
        >
          Escalations ({legalCount})
        </Button>
        <Button
          variant={activeFilter === "RESOLVED" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold text-emerald-800"
          onClick={() => setActiveFilter("RESOLVED")}
        >
          Resolved ({resolvedCount})
        </Button>
      </div>

      {filteredTickets.length === 0 ? (
        <CorporateEmptyState
          title="No Matching Support Tickets"
          description="There are no support tickets in this category. Raise a new support ticket to record buyer possession inquiries, billing disputes, or site complaints."
          actionLabel="Raise Support Ticket"
          onAction={() => setIsModalOpen(true)}
          icon={Headset}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Ticket Reference</TableHead>
                <TableHead className="text-xs font-semibold">Customer / Buyer Name</TableHead>
                <TableHead className="text-xs font-semibold">Subject & Category</TableHead>
                <TableHead className="text-xs font-semibold">Assigned Department</TableHead>
                <TableHead className="text-xs font-semibold">Priority</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                    {t.ticketReference}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {t.customerName}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <div className="font-medium text-foreground">{t.subject}</div>
                    <div className="text-[10px] text-muted-foreground">{t.category}</div>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {t.assignedDepartment}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {t.priority === "CRITICAL" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                        CRITICAL
                      </Badge>
                    ) : t.priority === "HIGH" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                        HIGH
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-medium border-border">
                        STANDARD
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    {t.status === "RESOLVED" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                        RESOLVED
                      </Badge>
                    ) : t.status === "PENDING_APPROVAL" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-purple-100 text-purple-800 border-purple-300">
                        IN ESCALATION
                      </Badge>
                    ) : t.status === "IN_PROGRESS" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-blue-100 text-blue-800 border-blue-300">
                        IN PROGRESS
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold bg-slate-100 text-slate-800 border-slate-300">
                        OPEN
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => setSelectedTicket(t)}
                    >
                      View Ticket
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Ticket Details & Resolution Drawer */}
      <Sheet open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <SheetContent className="w-full sm:max-w-lg border-border bg-card p-6 overflow-y-auto">
          {selectedTicket && (
            <div className="space-y-6">
              <SheetHeader className="pb-4 border-b border-border space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono font-bold">
                    {selectedTicket.ticketReference}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      selectedTicket.status === "RESOLVED"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : selectedTicket.status === "PENDING_APPROVAL"
                        ? "bg-purple-100 text-purple-800 border-purple-300"
                        : "bg-blue-100 text-blue-800 border-blue-300"
                    }`}
                  >
                    {selectedTicket.status}
                  </Badge>
                </div>
                <SheetTitle className="text-base font-bold text-foreground pt-1">
                  {selectedTicket.subject}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Logged on {new Date(selectedTicket.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 border border-border rounded-lg">
                  <div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> Customer
                    </span>
                    <p className="font-semibold text-foreground mt-0.5">{selectedTicket.customerName}</p>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" /> Assigned Department
                    </span>
                    <p className="font-semibold text-foreground mt-0.5">{selectedTicket.assignedDepartment}</p>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground">Category</span>
                    <p className="font-semibold text-foreground mt-0.5">{selectedTicket.category}</p>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground">Priority Level</span>
                    <p className="font-semibold text-foreground mt-0.5">{selectedTicket.priority}</p>
                  </div>

                  {selectedTicket.claimAmount > 0 && (
                    <div className="col-span-2 pt-2 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-amber-700" /> Dispute Claim Amount
                      </span>
                      <p className="text-sm font-mono font-bold text-primary mt-0.5">
                        {formatCurrency(selectedTicket.claimAmount)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-foreground">Ticket Status & Workflow Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.status !== "IN_PROGRESS" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusChange("IN_PROGRESS")}
                      >
                        {isUpdatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                        Mark In Progress
                      </Button>
                    )}

                    {selectedTicket.status !== "RESOLVED" && (
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1 bg-emerald-800 hover:bg-emerald-900 text-white"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusChange("RESOLVED")}
                      >
                        {isUpdatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Resolve Ticket
                      </Button>
                    )}

                    {selectedTicket.status === "RESOLVED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 text-amber-900 border-amber-300"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusChange("OPEN")}
                      >
                        {isUpdatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        Re-open Ticket
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newTkt) => {
          setTickets((prev) => [newTkt, ...prev]);
        }}
      />
    </div>
  );
}
