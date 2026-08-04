"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { History, PhoneCall, MessageSquare, Ticket, ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import { communicationsApi, CustomerTimelineEntry } from "@/services/communicationsApi";

export function CustomerTimelineView() {
  const [timeline, setTimeline] = useState<CustomerTimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await communicationsApi.getCustomerTimeline();
      setTimeline(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Customer timeline could not be loaded");
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
        <span>Loading consolidated customer interaction history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Customer Timeline Unreachable"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Consolidated Customer Interaction Timeline
          </h3>
        </div>
      </div>

      {timeline.length === 0 ? (
        <CorporateEmptyState
          title="No Customer Interactions Logged"
          description="There are currently no recorded customer interaction events. Customer calls, chat logs, and tickets will automatically log here."
          actionLabel="Refresh Feed"
          onAction={loadData}
          icon={History}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">UTC Timestamp</TableHead>
                <TableHead className="text-xs font-semibold">Customer / Buyer Name</TableHead>
                <TableHead className="text-xs font-semibold">Assigned Unit</TableHead>
                <TableHead className="text-xs font-semibold">Interaction Type</TableHead>
                <TableHead className="text-xs font-semibold">Interaction Summary</TableHead>
                <TableHead className="text-xs font-semibold text-right">Logged By Officer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeline.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {new Date(item.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {item.customerName}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {item.unitNumber}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <div className="flex items-center gap-1.5">
                      {item.interactionType === "Call Log" ? (
                        <PhoneCall className="h-3.5 w-3.5 text-blue-700" />
                      ) : item.interactionType === "Chat Message" ? (
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-700" />
                      ) : item.interactionType === "Support Ticket" ? (
                        <Ticket className="h-3.5 w-3.5 text-amber-700" />
                      ) : (
                        <ShieldAlert className="h-3.5 w-3.5 text-red-700" />
                      )}
                      <Badge variant="outline" className="text-[10px] font-medium border-border">
                        {item.interactionType}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground font-medium">
                    {item.summary}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-medium text-foreground">
                    {item.officerName}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
