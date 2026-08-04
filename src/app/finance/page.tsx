"use client";

import React, { useState } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, BookOpen, PieChart, Landmark } from "lucide-react";
import { FinancialOverviewView } from "@/components/modules/finance/FinancialOverviewView";
import { GeneralLedgerView } from "@/components/modules/finance/GeneralLedgerView";
import { BudgetManagementView } from "@/components/modules/finance/BudgetManagementView";
import { HITLDisbursementsView } from "@/components/modules/finance/HITLDisbursementsView";
import { FinanceApprovalDrawer } from "@/components/modules/finance/FinanceApprovalDrawer";

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState<boolean>(false);

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="Finance ERP & Budget Management Workspace"
        badgeText="ENTERPRISE BOS"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
            onClick={() => setIsApprovalDrawerOpen(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
            CFO Approval Queue
            <Badge variant="secondary" className="bg-amber-200 text-amber-950 text-[9px] px-1 py-0 ml-0.5">
              2
            </Badge>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="w-full h-auto flex flex-wrap border-b border-border bg-transparent p-0 gap-1">
          <TabsTrigger
            value="overview"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Landmark className="h-3.5 w-3.5" />
            Financial Overview
          </TabsTrigger>

          <TabsTrigger
            value="ledger"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <BookOpen className="h-3.5 w-3.5" />
            General Ledger
          </TabsTrigger>

          <TabsTrigger
            value="budgets"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <PieChart className="h-3.5 w-3.5" />
            Cost Center Budgets
          </TabsTrigger>

          <TabsTrigger
            value="approvals"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            HITL Disbursements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="outline-none space-y-4 pt-2">
          <FinancialOverviewView />
        </TabsContent>

        <TabsContent value="ledger" className="outline-none space-y-4 pt-2">
          <GeneralLedgerView />
        </TabsContent>

        <TabsContent value="budgets" className="outline-none space-y-4 pt-2">
          <BudgetManagementView />
        </TabsContent>

        <TabsContent value="approvals" className="outline-none space-y-4 pt-2">
          <HITLDisbursementsView onOpenApprovalDrawer={() => setIsApprovalDrawerOpen(true)} />
        </TabsContent>
      </Tabs>

      <FinanceApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
      />
    </div>
  );
}

