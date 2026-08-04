"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { PortfolioProject } from "@/services/dashboardApi";
import { ArrowRight, Building2 } from "lucide-react";

interface ProjectPortfolioTableProps {
  projects: PortfolioProject[];
}

function realizationTone(pct: number): string {
  if (pct >= 75) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (pct >= 40) return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-muted text-muted-foreground border-border";
}

export function ProjectPortfolioTable({ projects }: ProjectPortfolioTableProps) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-xs h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <h3 className="text-sm font-bold font-heading text-foreground">Development Portfolio</h3>
        <Link href="/crm" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          Open Sales Workspace
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="p-4">
          <CorporateEmptyState
            title="No Developments Registered"
            description="Register a development to track inventory and sanctioned budgets."
            icon={Building2}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Development</TableHead>
                <TableHead className="text-xs font-semibold">Location</TableHead>
                <TableHead className="text-xs font-semibold text-center">Units</TableHead>
                <TableHead className="text-xs font-semibold text-center">Booked</TableHead>
                <TableHead className="text-xs font-semibold text-center">Realization</TableHead>
                <TableHead className="text-xs font-semibold text-right">Sanctioned Budget</TableHead>
                <TableHead className="text-xs font-semibold text-center">Target Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={`${project.projectName}-${project.location}`} className="hover:bg-muted/30">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {project.projectName}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground">{project.location}</TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono">{project.totalUnits}</TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono">{project.bookedUnits}</TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${realizationTone(project.realizationPct)}`}
                    >
                      {project.realizationPct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-semibold text-foreground">
                    ₹{project.sanctionedBudgetCr.toFixed(2)} Cr
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                    {project.targetCompletion || "Not set"}
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
