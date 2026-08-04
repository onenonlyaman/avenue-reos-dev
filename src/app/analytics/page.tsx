"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, LineChart, DollarSign, ShieldAlert } from "lucide-react";
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

  const loadPendingApprovals = async () => {
    try {
      const res = await analyticsApi.getPendingApprovals();
      setPendingApprovalsCount(res.length);
    } catch {
      setPendingApprovalsCount(0);
    }
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
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 font-medium"
            onClick={() => setIsApprovalDrawerOpen(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
            Board Approval Queue
            <Badge variant="secondary" className="bg-amber-200 text-amber-950 text-[9px] px-1 py-0 ml-0.5 font-bold">
              {pendingApprovalsCount}
            </Badge>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="w-full h-auto flex flex-wrap border-b border-border bg-transparent p-0 gap-1">
          <TabsTrigger
            value="valuation"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Portfolio GDV & Valuation
          </TabsTrigger>

          <TabsTrigger
            value="liquidity"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <LineChart className="h-3.5 w-3.5" />
            Liquidity & Cash Flow
          </TabsTrigger>

          <TabsTrigger
            value="irr"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Project IRR & Margins
          </TabsTrigger>

          <TabsTrigger
            value="risk"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Governance & Risk Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="valuation" className="outline-none space-y-4 pt-2">
          <PortfolioValuationView />
        </TabsContent>

        <TabsContent value="liquidity" className="outline-none space-y-4 pt-2">
          <LiquidityCashflowView />
        </TabsContent>

        <TabsContent value="irr" className="outline-none space-y-4 pt-2">
          <ProjectIrrView />
        </TabsContent>

        <TabsContent value="risk" className="outline-none space-y-4 pt-2">
          <EnterpriseRiskView />
        </TabsContent>
      </Tabs>

      <BoardApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onCapitalProcessed={loadPendingApprovals}
      />
    </div>
  );
}

