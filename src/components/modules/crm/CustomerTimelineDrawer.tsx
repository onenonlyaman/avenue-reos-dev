"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeadRecord } from "./LeadManagementView";
import { History, PhoneCall, CalendarCheck, FileText, CheckCircle2, MessageSquare, Clock, User } from "lucide-react";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";

interface CustomerTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadRecord | null;
}

function getStageIcon(stage: string) {
  const lower = stage.toLowerCase();
  if (lower.includes("call") || lower.includes("phone")) return PhoneCall;
  if (lower.includes("site") || lower.includes("visit") || lower.includes("tour")) return CalendarCheck;
  if (lower.includes("quote") || lower.includes("quotation") || lower.includes("estimate")) return FileText;
  if (lower.includes("booking") || lower.includes("approved")) return CheckCircle2;
  if (lower.includes("message") || lower.includes("chat") || lower.includes("discussion")) return MessageSquare;
  return Clock;
}

export function CustomerTimelineDrawer({
  isOpen,
  onClose,
  lead,
}: CustomerTimelineDrawerProps) {
  if (!lead) return null;

  const rawEvents = lead.events || [];
  const events = rawEvents.length > 0
    ? rawEvents
    : [
        {
          id: `initial-${lead.id}`,
          stage: "Inquiry Log",
          timestamp: lead.createdDate,
          actor: lead.assignedRep || "System",
          description: `Prospect profile recorded with initial status ${lead.status}. Interested in ${lead.interestedProject || "General Inquiry"}.`,
          completed: true,
        },
      ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md w-full p-6 flex flex-col h-full bg-card text-card-foreground">
        <SheetHeader className="pb-3 border-b border-border space-y-1">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono">
              CUSTOMER AUDIT TRAIL
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">{lead.id.slice(0, 8)}</span>
          </div>
          <SheetTitle className="text-lg font-bold font-heading flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Prospect Lifecycle Activity Timeline
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {lead.name} ({lead.phone}) {lead.interestedProject ? `— ${lead.interestedProject}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 text-xs">
          <div className="bg-muted/40 p-3 rounded-lg border border-border flex justify-between items-center text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">Lead Ingestion Source</span>
              <span className="font-semibold text-foreground">{lead.source}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">Lead Score Index</span>
              <span className="font-bold text-emerald-800 font-mono">{lead.leadScore} / 100</span>
            </div>
          </div>

          {events.length === 0 ? (
            <CorporateEmptyState
              title="No Activity Logged"
              description="No phone calls, meetings or notes recorded for this prospect yet."
              icon={User}
            />
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {events.map((event) => {
                const Icon = getStageIcon(event.stage);
                return (
                  <div key={event.id} className="relative flex items-start gap-3">
                    <div
                      className={`absolute -left-[21px] top-0.5 h-5 w-5 rounded-full flex items-center justify-center border text-[10px] ${
                        event.completed
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                    </div>

                    <div className="space-y-1 w-full bg-card p-3 rounded-lg border border-border shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-xs font-heading">
                          {event.stage}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {event.timestamp}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>

                      <div className="pt-1.5 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50">
                        <span>Logged by: <strong className="text-foreground font-medium">{event.actor}</strong></span>
                        <span className={event.completed ? "text-emerald-700 font-medium" : "text-amber-700"}>
                          {event.completed ? "Verified Stage" : "Pending Action"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border pt-3">
          <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={onClose}>
            Close Activity Timeline
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
