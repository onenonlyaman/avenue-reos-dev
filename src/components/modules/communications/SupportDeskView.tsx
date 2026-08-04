"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Headset, AlertTriangle, CheckCircle2, ShieldAlert, PlusCircle, AlertCircle, Loader2 } from "lucide-react";
import { communicationsApi, SupportTicket } from "@/services/communicationsApi";
import { CreateTicketModal } from "./CreateTicketModal";

export function SupportDeskView() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          subtext="Response Threshold &gt; 24h"
          icon={AlertTriangle}
          trend="Escalation Risk"
          trendDirection={slaRiskCount > 0 ? "down" : "up"}
        />

        <CorporateStatCard
          label="Resolved Today"
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

      {tickets.length === 0 ? (
        <CorporateEmptyState
          title="No Active Support Tickets"
          description="The support desk queue is clear. Raise a new support ticket to record buyer possession inquiries, billing disputes, or site complaints."
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
                <TableHead className="text-xs font-semibold text-center">SLA Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t) => (
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
                    {t.slaStatus === "ON_TRACK" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                        ON TRACK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                        SLA BREACHED
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <Button variant="outline" size="sm" className="h-7 text-[11px]">
                      View Ticket
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newTkt) => setTickets((prev) => [newTkt, ...prev])}
      />
    </div>
  );
}
