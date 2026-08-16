"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  BookOpen,
  Receipt,
  Vault,
  FileCheck,
  Warehouse,
  Landmark,
  BarChart3,
  Calculator,
  Lock,
  FileText,
} from "lucide-react";
import { BookScope } from "@/lib/accounting/multiBookScope";
import { MultiBookScopeSelector } from "@/components/modules/finance/tally/MultiBookScopeSelector";
import { ChartOfAccountsView } from "@/components/modules/finance/tally/ChartOfAccountsView";
import { VoucherEntryView } from "@/components/modules/finance/tally/VoucherEntryView";
import { CashVaultRegisterView } from "@/components/modules/finance/tally/CashVaultRegisterView";
import { StatutoryComplianceView } from "@/components/modules/finance/tally/StatutoryComplianceView";
import { InventoryManufacturingView } from "@/components/modules/finance/tally/InventoryManufacturingView";
import { ConnectedBankingView } from "@/components/modules/finance/tally/ConnectedBankingView";
import { FinancialReportsView } from "@/components/modules/finance/tally/FinancialReportsView";
import { FinancialToolsCalculatorsView } from "@/components/modules/finance/tally/FinancialToolsCalculatorsView";
import { McaAuditLogView } from "@/components/modules/finance/tally/McaAuditLogView";
import { BudgetRegulatoryView } from "@/components/modules/finance/tally/BudgetRegulatoryView";
import { TallyApprovalDrawer } from "@/components/modules/finance/tally/TallyApprovalDrawer";
import { tallyErpApi } from "@/services/tallyErpApi";

export default function TallyErpWorkspacePage() {
  const [activeTab, setActiveTab] = useState<string>("vouchers");
  const [bookScope, setBookScope] = useState<BookScope>("STATUTORY");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const checkPendingCount = async () => {
    try {
      const data = await tallyErpApi.fetchPendingApprovals();
      setPendingCount(data.length);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    checkPendingCount();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="Enterprise Tally ERP & Statutory Compliance Subsystem"
        badgeText="TALLY PRIME ERP"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 font-medium"
            onClick={() => setIsDrawerOpen(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
            Governance Director Approvals
            {pendingCount > 0 && (
              <Badge variant="secondary" className="bg-amber-200 text-amber-950 text-[9px] px-1 py-0 ml-0.5 font-bold">
                {pendingCount}
              </Badge>
            )}
          </Button>
        }
      />

      {/* Global Multi-Book Scope Selector */}
      <MultiBookScopeSelector currentScope={bookScope} onScopeChange={setBookScope} userRole="SUPER_ADMIN" />

      {/* Unified Tab Slider Navigation with Responsive Hidden Horizontal Scrollbar and Vertical Breathing Room */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1.5 py-1.5 border border-border rounded-xl min-h-[46px] h-auto w-full sm:w-auto flex overflow-x-auto justify-start gap-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="vouchers" className="text-xs h-8.5 gap-1.5 px-3.5 font-medium shrink-0">
            <Receipt className="h-3.5 w-3.5" />
            Vouchers
          </TabsTrigger>

          <TabsTrigger value="coa" className="text-xs h-8.5 gap-1.5 px-3.5 font-medium shrink-0">
            <BookOpen className="h-3.5 w-3.5" />
            CoA Tree
          </TabsTrigger>

          <TabsTrigger value="vault" className="text-xs h-8.5 gap-1.5 px-3.5 font-medium shrink-0">
            <Vault className="h-3.5 w-3.5" />
            Cash Vault
          </TabsTrigger>

          <TabsTrigger value="gst" className="text-xs h-8.5 gap-1.5 px-3.5 font-medium shrink-0">
            <FileCheck className="h-3.5 w-3.5" />
            GST & TDS
          </TabsTrigger>

          <TabsTrigger value="banking" className="text-xs h-8.5 gap-1.5 px-3.5 font-medium shrink-0">
            <Landmark className="h-3.5 w-3.5" />
            e-BRS Recon
          </TabsTrigger>

          <TabsTrigger value="inventory" className="text-xs h-8.5 gap-1.5 px-3.5 font-medium shrink-0">
            <Warehouse className="h-3.5 w-3.5" />
            Godown & BOM
          </TabsTrigger>

          <TabsTrigger value="reports" className="text-xs h-8.5 gap-1.5 px-3.5 font-medium shrink-0">
            <BarChart3 className="h-3.5 w-3.5" />
            Financials
          </TabsTrigger>

          <TabsTrigger value="tools" className="text-xs h-8.5 gap-1.5 px-3.5 font-medium shrink-0">
            <Calculator className="h-3.5 w-3.5" />
            Tools & SES
          </TabsTrigger>

          <TabsTrigger value="mca" className="text-xs h-8.5 gap-1.5 px-3.5 font-medium shrink-0">
            <Lock className="h-3.5 w-3.5" />
            MCA Audit
          </TabsTrigger>

          <TabsTrigger value="regulatory" className="text-xs h-8.5 gap-1.5 px-3.5 font-medium shrink-0">
            <FileText className="h-3.5 w-3.5" />
            Budget 2026
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vouchers" className="outline-none space-y-4">
          <VoucherEntryView bookScope={bookScope} />
        </TabsContent>

        <TabsContent value="coa" className="outline-none space-y-4">
          <ChartOfAccountsView bookScope={bookScope} />
        </TabsContent>

        <TabsContent value="vault" className="outline-none space-y-4">
          <CashVaultRegisterView />
        </TabsContent>

        <TabsContent value="gst" className="outline-none space-y-4">
          <StatutoryComplianceView />
        </TabsContent>

        <TabsContent value="banking" className="outline-none space-y-4">
          <ConnectedBankingView />
        </TabsContent>

        <TabsContent value="inventory" className="outline-none space-y-4">
          <InventoryManufacturingView />
        </TabsContent>

        <TabsContent value="reports" className="outline-none space-y-4">
          <FinancialReportsView bookScope={bookScope} />
        </TabsContent>

        <TabsContent value="tools" className="outline-none space-y-4">
          <FinancialToolsCalculatorsView />
        </TabsContent>

        <TabsContent value="mca" className="outline-none space-y-4">
          <McaAuditLogView />
        </TabsContent>

        <TabsContent value="regulatory" className="outline-none space-y-4">
          <BudgetRegulatoryView />
        </TabsContent>
      </Tabs>

      <TallyApprovalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={checkPendingCount}
      />
    </div>
  );
}
