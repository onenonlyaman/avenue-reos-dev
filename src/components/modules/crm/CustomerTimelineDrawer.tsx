"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeadRecord } from "./LeadManagementView";
import { History, PhoneCall, CalendarCheck, FileText, CheckCircle2, CreditCard, ArrowRight } from "lucide-react";

interface CustomerTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadRecord | null;
}

interface TimelineEvent {
  id: string;
  stage: "Inquiry Log" | "IVR Call Summary" | "Site Visit Conducted" | "Quotation Generated" | "Booking Request Submitted" | "Payment Receipt Verified";
  timestamp: string;
  actor: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
}

export function CustomerTimelineDrawer({
  isOpen,
  onClose,
  lead,
}: CustomerTimelineDrawerProps) {
  if (!lead) return null;

  const events: TimelineEvent[] = [
    {
      id: "EV-101",
      stage: "Inquiry Log",
      timestamp: "2026-07-28 10:14",
      actor: "Automated Web Gateway",
      description: `Inquiry submitted via corporate portal for ${lead.interestedProject} (${lead.unitType}).`,
      icon: FileText,
      completed: true,
    },
    {
      id: "EV-102",
      stage: "IVR Call Summary",
      timestamp: "2026-07-28 14:30",
      actor: "Tele-Sales System",
      description: "Automated IVR call completed. Lead expressed high interest in 3 BHK floor options above Floor 5.",
      icon: PhoneCall,
      completed: true,
    },
    {
      id: "EV-103",
      stage: "Site Visit Conducted",
      timestamp: "2026-07-30 11:00",
      actor: lead.assignedRep,
      description: `Personal site tour conducted at ${lead.interestedProject} sample flat. Accompanied by family.`,
      icon: CalendarCheck,
      completed: lead.status === "Site Visit Scheduled" || lead.status === "Qualified",
    },
    {
      id: "EV-104",
      stage: "Quotation Generated",
      timestamp: "2026-07-30 15:45",
      actor: lead.assignedRep,
      description: "Commercial estimate generated for Unit 904. Base Rate: ₹5,800/sq.ft. with clubhouse allocation.",
      icon: FileText,
      completed: lead.status === "Qualified",
    },
    {
      id: "EV-105",
      stage: "Booking Request Submitted",
      timestamp: "2026-08-01 16:20",
      actor: lead.assignedRep,
      description: "Unit reservation proposal logged. Submitted for executive discount authorization.",
      icon: CheckCircle2,
      completed: lead.status === "Qualified",
    },
    {
      id: "EV-106",
      stage: "Payment Receipt Verified",
      timestamp: "2026-08-02 09:00",
      actor: "Finance Accounts Team",
      description: "Initial booking token payment of ₹2,00,000 verified via RTGS transaction banking ledger.",
      icon: CreditCard,
      completed: false,
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
            <span className="text-xs text-muted-foreground font-mono">{lead.id}</span>
          </div>
          <SheetTitle className="text-lg font-bold font-heading flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Prospect Lifecycle Activity Timeline
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {lead.name} ({lead.phone}) — {lead.interestedProject}
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

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {events.map((event) => {
              const Icon = event.icon;
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
