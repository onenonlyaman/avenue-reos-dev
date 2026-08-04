"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_DEPARTMENTS } from "@/lib/departments";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Cpu,
  DollarSign,
  Globe,
  HardHat,
  Key,
  MessageSquare,
  Package,
  Scale,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  Activity,
  BarChart3,
  Cpu,
  DollarSign,
  Globe,
  HardHat,
  Key,
  MessageSquare,
  Package,
  Scale,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
};

interface DepartmentNavigationGridProps {
  activeDepartmentsCount: number;
}

export function DepartmentNavigationGrid({ activeDepartmentsCount }: DepartmentNavigationGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-base font-bold font-heading tracking-tight text-foreground">Company Departments</h2>
        <span className="text-xs text-muted-foreground font-mono">
          {activeDepartmentsCount} Active Departments
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {PLATFORM_DEPARTMENTS.map((department) => {
          const Icon = DEPARTMENT_ICONS[department.iconName] || Activity;

          return (
            <Link
              key={department.href}
              href={department.href}
              className="group flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-xs transition-colors hover:bg-muted/50"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-9 w-9 rounded border border-border bg-muted flex items-center justify-center">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border-emerald-200"
                  >
                    Active
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground font-heading group-hover:text-primary transition-colors">
                    {department.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{department.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-3 border-t border-border">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {department.scopeTag}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Open Workspace
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
