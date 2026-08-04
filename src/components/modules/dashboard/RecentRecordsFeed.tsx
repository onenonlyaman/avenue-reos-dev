"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { RecentRecord } from "@/services/dashboardApi";
import { FileClock, HardHat, LifeBuoy, ReceiptText, UserPlus, type LucideIcon } from "lucide-react";

interface RecentRecordsFeedProps {
  records: RecentRecord[];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Booking: ReceiptText,
  "Contractor Claim": HardHat,
  Prospect: UserPlus,
  "Support Ticket": LifeBuoy,
};

function relativeTime(timestamp: string): string {
  const elapsedMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(elapsedMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function RecentRecordsFeed({ records }: RecentRecordsFeedProps) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-xs p-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <h3 className="text-sm font-bold font-heading text-foreground">Latest Records</h3>
      </div>

      {records.length === 0 ? (
        <CorporateEmptyState
          title="No Recent Records"
          description="Bookings, claims, prospects and support requests appear here as they are raised."
          icon={FileClock}
        />
      ) : (
        <div className="flex-1 divide-y divide-border pt-1">
          {records.map((record) => {
            const Icon = CATEGORY_ICONS[record.category] || FileClock;
            return (
              <div key={`${record.category}-${record.label}`} className="flex items-start gap-3 py-2.5">
                <div className="h-7 w-7 rounded border border-border bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-3.5 w-3.5 text-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{record.label}</span>
                    <Badge variant="outline" className="text-[9px] font-medium border-border text-muted-foreground">
                      {record.category}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{record.detail}</div>
                </div>

                <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5">
                  {relativeTime(record.occurredAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
