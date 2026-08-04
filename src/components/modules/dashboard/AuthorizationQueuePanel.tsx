"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { AuthorizationQueue } from "@/services/dashboardApi";
import { ArrowRight, ShieldCheck } from "lucide-react";

interface AuthorizationQueuePanelProps {
  queues: AuthorizationQueue[];
  totalPending: number;
}

export function AuthorizationQueuePanel({ queues, totalPending }: AuthorizationQueuePanelProps) {
  const peak = queues.reduce((max, queue) => Math.max(max, queue.pendingCount), 0);

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs p-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <h3 className="text-sm font-bold font-heading text-foreground">Authorization Queues</h3>
        <Badge variant="outline" className="text-[10px] font-mono bg-amber-50 text-amber-900 border-amber-200">
          {totalPending} awaiting
        </Badge>
      </div>

      {queues.length === 0 ? (
        <CorporateEmptyState
          title="No Items Awaiting Authorization"
          description="Every governance queue is currently clear."
          icon={ShieldCheck}
        />
      ) : (
        <div className="flex-1 space-y-2.5 pt-4">
          {queues.map((queue) => (
            <div key={queue.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{queue.label}</span>
                <span className="font-mono font-semibold text-foreground">{queue.pendingCount}</span>
              </div>
              <div className="h-1.5 w-full rounded-sm bg-muted overflow-hidden">
                <div
                  className="h-full rounded-sm bg-amber-500"
                  style={{ width: `${peak > 0 ? (queue.pendingCount / peak) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}

          <Link
            href="/system-status"
            className="inline-flex items-center gap-1 pt-2 text-xs font-semibold text-primary"
          >
            Review governance summary
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
