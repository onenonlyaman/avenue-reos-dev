"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, 
  TrendingUp, 
  HardHat, 
  Bot, 
  Layers, 
  Users, 
  DollarSign, 
  Cpu, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardMetrics {
  salesPipelineCr: number;
  constructionProgressPct: number;
  committedBudgetCr: number;
  automatedWorkflowsCount: number;
  totalProjectsCount: number;
  totalUnitsCount: number;
  activeLeadsCount: number;
}

export default function Home() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/dashboard/metrics");
      const envelope = await res.json();
      if (envelope.success && envelope.data) {
        setMetrics(envelope.data);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded border border-border bg-muted text-muted-foreground text-xs">
              <Zap className="h-3 w-3 text-amber-600" />
              <span>Avenue Builders • Nashik Real Estate Operations</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Real Estate Operating Console
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 gap-1.5 py-1 px-2.5 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Workflows Active
            </Badge>
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 py-1 px-2.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              Verified Account
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sales Pipeline Demand</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground font-mono">
                  ₹{(metrics?.salesPipelineCr || 0).toFixed(2)} Cr
                </div>
                <p className="text-xs text-emerald-600 mt-1 font-mono">
                  {metrics?.activeLeadsCount || 0} Qualified Leads
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tower Inventory Realization</CardTitle>
            <HardHat className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground font-mono">
                  {(metrics?.constructionProgressPct || 0).toFixed(1)}%
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  {metrics?.totalUnitsCount || 0} Units in Inventory
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Committed Budget Liabilities</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground font-mono">
                  ₹{(metrics?.committedBudgetCr || 0).toFixed(2)} Cr
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">Across Active Cost Centres</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Automated HITL Approvals</CardTitle>
            <Bot className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground font-mono">
                  {metrics?.automatedWorkflowsCount || 0} Pending
                </div>
                <p className="text-xs text-purple-600 mt-1">Awaiting Executive Authorization</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2 font-heading">
            <Layers className="h-4 w-4 text-primary" /> Company Departments
          </h2>
          <Badge variant="outline" className="border-border text-muted-foreground font-medium">6 Active Departments</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-card border-border shadow-xs hover:border-primary/50 transition-colors group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
              </div>
              <CardTitle className="text-base mt-2 text-foreground group-hover:text-primary transition-colors font-heading">
                CRM & Sales Management
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between text-xs border-t border-border mt-2 pt-3">
              <span className="text-[11px] text-muted-foreground">Real Estate Sales</span>
              <Link
                href="/crm"
                className={buttonVariants({ variant: "ghost", size: "sm", className: "h-7 text-xs px-2 text-primary hover:text-primary" })}
              >
                Open Workspace <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-xs hover:border-primary/50 transition-colors group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900">
                  <DollarSign className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
              </div>
              <CardTitle className="text-base mt-2 text-foreground group-hover:text-primary transition-colors font-heading">
                Finance & Accounting
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between text-xs border-t border-border mt-2 pt-3">
              <span className="text-[11px] text-muted-foreground">Financial Control</span>
              <Link
                href="/finance"
                className={buttonVariants({ variant: "ghost", size: "sm", className: "h-7 text-xs px-2 text-primary hover:text-primary" })}
              >
                Open Workspace <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-xs hover:border-primary/50 transition-colors group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900">
                  <HardHat className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
              </div>
              <CardTitle className="text-base mt-2 text-foreground group-hover:text-primary transition-colors font-heading">
                Construction & Sites
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between text-xs border-t border-border mt-2 pt-3">
              <span className="text-[11px] text-muted-foreground">Site Operations</span>
              <Link
                href="/construction"
                className={buttonVariants({ variant: "ghost", size: "sm", className: "h-7 text-xs px-2 text-primary hover:text-primary" })}
              >
                Open Workspace <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-xs hover:border-primary/50 transition-colors group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900">
                  <Building2 className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
              </div>
              <CardTitle className="text-base mt-2 text-foreground group-hover:text-primary transition-colors font-heading">
                Procurement & Materials
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between text-xs border-t border-border mt-2 pt-3">
              <span className="text-[11px] text-muted-foreground">Supply Chain</span>
              <Link
                href="/procurement-inventory"
                className={buttonVariants({ variant: "ghost", size: "sm", className: "h-7 text-xs px-2 text-primary hover:text-primary" })}
              >
                Open Workspace <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-xs hover:border-primary/50 transition-colors group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-900">
                  <Users className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
              </div>
              <CardTitle className="text-base mt-2 text-foreground group-hover:text-primary transition-colors font-heading">
                HR & Payroll
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between text-xs border-t border-border mt-2 pt-3">
              <span className="text-[11px] text-muted-foreground">Staffing & Payroll</span>
              <Link
                href="/hr-payroll"
                className={buttonVariants({ variant: "ghost", size: "sm", className: "h-7 text-xs px-2 text-primary hover:text-primary" })}
              >
                Open Workspace <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-xs hover:border-primary/50 transition-colors group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-900">
                  <Cpu className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
              </div>
              <CardTitle className="text-base mt-2 text-foreground group-hover:text-primary transition-colors font-heading">
                Team Communications
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between text-xs border-t border-border mt-2 pt-3">
              <span className="text-[11px] text-muted-foreground">Team Messaging</span>
              <Link
                href="/communications"
                className={buttonVariants({ variant: "ghost", size: "sm", className: "h-7 text-xs px-2 text-primary hover:text-primary" })}
              >
                Open Workspace <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



