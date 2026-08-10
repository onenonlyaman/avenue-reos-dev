"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, BookOpen, FileCheck, Warehouse, Landmark, BarChart3 } from "lucide-react";
import { VoucherEntryView } from "@/components/modules/finance/tally/VoucherEntryView";
import { StatutoryComplianceView } from "@/components/modules/finance/tally/StatutoryComplianceView";
import { InventoryManufacturingView } from "@/components/modules/finance/tally/InventoryManufacturingView";
import { ConnectedBankingView } from "@/components/modules/finance/tally/ConnectedBankingView";
import { FinancialReportsView } from "@/components/modules/finance/tally/FinancialReportsView";
import { TallyApprovalDrawer } from "@/components/modules/finance/tally/TallyApprovalDrawer";
import { tallyErpApi } from "@/services/tallyErpApi";

export default function TallyErpWorkspacePage() {
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <CorporatePageHeader
        title="Tally-Equivalent Accounting & Statutory Compliance ERP"
        subtitle="Double-entry vouchers, statutory GST/TDS returns, multi-godown inventory, e-BRS, and auditor workspace"
        badgeText="Tally Prime Subsystem"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold gap-2 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
            onClick={() => setIsDrawerOpen(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
            Governance Director Approvals
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-4 px-1 text-[9px] rounded-full">
                {pendingCount}
              </Badge>
            )}
          </Button>
        }
      />

      <Tabs defaultValue="vouchers" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-10 border border-border bg-card p-1 rounded-lg">
          <TabsTrigger value="vouchers" className="text-xs font-semibold gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            1. Voucher Posting & Ledger
          </TabsTrigger>
          <TabsTrigger value="statutory" className="text-xs font-semibold gap-1.5">
            <FileCheck className="h-3.5 w-3.5" />
            2. Statutory & MCA Compliance
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs font-semibold gap-1.5">
            <Warehouse className="h-3.5 w-3.5" />
            3. Godown Stock & Manufacturing
          </TabsTrigger>
          <TabsTrigger value="banking" className="text-xs font-semibold gap-1.5">
            <Landmark className="h-3.5 w-3.5" />
            4. Connected Banking & BRS
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs font-semibold gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            5. Financial Statements & Sampling
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vouchers" className="pt-6">
          <VoucherEntryView />
        </TabsContent>
        <TabsContent value="statutory" className="pt-6">
          <StatutoryComplianceView />
        </TabsContent>
        <TabsContent value="inventory" className="pt-6">
          <InventoryManufacturingView />
        </TabsContent>
        <TabsContent value="banking" className="pt-6">
          <ConnectedBankingView />
        </TabsContent>
        <TabsContent value="reports" className="pt-6">
          <FinancialReportsView />
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
