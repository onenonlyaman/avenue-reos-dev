"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, LineChart, DollarSign, ShieldAlert, RotateCcw } from "lucide-react";
import { PortfolioValuationView } from "@/components/modules/analytics/PortfolioValuationView";
import { LiquidityCashflowView } from "@/components/modules/analytics/LiquidityCashflowView";
import { ProjectIrrView } from "@/components/modules/analytics/ProjectIrrView";
import { EnterpriseRiskView } from "@/components/modules/analytics/EnterpriseRiskView";
import { BoardApprovalDrawer } from "@/components/modules/analytics/BoardApprovalDrawer";
import { analyticsApi } from "@/services/analyticsApi";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<string>("valuation");
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const loadPendingApprovals = async () => {
    try {
      const res = await analyticsApi.getPendingApprovals();
      setPendingApprovalsCount(res.length);
    } catch {
      setPendingApprovalsCount(0);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    loadPendingApprovals();
  };

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="Executive Analytics & Enterprise Risk Intelligence Workspace"
        badgeText="EXECUTIVE INTELLIGENCE"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleRefresh}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Refresh Analytics
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-medium"
              onClick={() => setIsApprovalDrawerOpen(true)}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Board Approval Queue
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-900 dark:text-amber-200 text-[9px] px-1.5 py-0 ml-0.5 font-bold">
                {pendingApprovalsCount}
              </Badge>
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-lg h-10 w-full sm:w-auto flex overflow-x-auto justify-start">
          <TabsTrigger value="valuation" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            Portfolio GDV & Valuation
          </TabsTrigger>

          <TabsTrigger value="liquidity" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <LineChart className="h-3.5 w-3.5" />
            Liquidity & Cash Flow
          </TabsTrigger>

          <TabsTrigger value="irr" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <DollarSign className="h-3.5 w-3.5" />
            Project IRR & Margins
          </TabsTrigger>

          <TabsTrigger value="risk" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <ShieldAlert className="h-3.5 w-3.5" />
            Governance & Risk Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="valuation" key={`val-${refreshKey}`} className="outline-none space-y-4">
          <PortfolioValuationView />
        </TabsContent>

        <TabsContent value="liquidity" key={`liq-${refreshKey}`} className="outline-none space-y-4">
          <LiquidityCashflowView />
        </TabsContent>

        <TabsContent value="irr" key={`irr-${refreshKey}`} className="outline-none space-y-4">
          <ProjectIrrView />
        </TabsContent>

        <TabsContent value="risk" key={`risk-${refreshKey}`} className="outline-none space-y-4">
          <EnterpriseRiskView />
        </TabsContent>
      </Tabs>

      <BoardApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onCapitalProcessed={handleRefresh}
      />
    </div>
  );
}
