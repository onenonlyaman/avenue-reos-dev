"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Building2, ShieldCheck, Workflow } from "lucide-react";

export function DashboardHeaderBanner() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded border border-border bg-muted text-muted-foreground text-xs">
            <Building2 className="h-3 w-3" />
            <span>Avenue Builders • Nashik Real Estate Operations</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            Real Estate Operating Console
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Centralized platform managing property developments across Gangapur Road, Indira Nagar, and Pathardi
            Phata, customer booking pipelines, INR financial budgets, site progress, and automated workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 py-1 px-2.5 font-medium bg-emerald-600 text-white border-emerald-700"
          >
            <Workflow className="h-3.5 w-3.5" />
            Workflows Active
          </Badge>

          <Badge
            variant="outline"
            className="gap-1.5 py-1 px-2.5 font-medium bg-muted text-foreground border-border"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Account
          </Badge>
        </div>
      </div>
    </div>
  );
}
