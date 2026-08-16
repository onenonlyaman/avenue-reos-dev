"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Receipt, Wrench, ShieldCheck, ShieldAlert } from "lucide-react";
import { HandoverPossessionView } from "@/components/modules/facility/HandoverPossessionView";
import { CamBillingView } from "@/components/modules/facility/CamBillingView";
import { ServiceTicketsView } from "@/components/modules/facility/ServiceTicketsView";
import { FacilityAssetsView } from "@/components/modules/facility/FacilityAssetsView";
import { FacilityApprovalDrawer } from "@/components/modules/facility/FacilityApprovalDrawer";
import { facilityApi } from "@/services/facilityApi";

export default function FacilityPage() {
  const [activeTab, setActiveTab] = useState<string>("handover");
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState<boolean>(false);

  const loadPendingApprovals = async () => {
    try {
      const res = await facilityApi.getPendingApprovals();
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
        title="Property Operations & Facility Management Workspace"
        badgeText="PROPERTY OPERATIONS"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 font-medium"
            onClick={() => setIsApprovalDrawerOpen(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
            Director Approval Queue
            <Badge variant="secondary" className="bg-amber-200 text-amber-950 text-[9px] px-1 py-0 ml-0.5 font-bold">
              {pendingApprovalsCount}
            </Badge>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-lg h-10 w-full sm:w-auto flex overflow-x-auto justify-start">
          <TabsTrigger value="handover" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <KeyRound className="h-3.5 w-3.5" />
            Handover & Possession
          </TabsTrigger>

          <TabsTrigger value="cam" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Receipt className="h-3.5 w-3.5" />
            CAM Billing Ledger
          </TabsTrigger>

          <TabsTrigger value="tickets" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Wrench className="h-3.5 w-3.5" />
            Service Tickets & SLA
          </TabsTrigger>

          <TabsTrigger value="assets" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Facility Assets & AMC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="handover" className="outline-none space-y-4">
          <HandoverPossessionView />
        </TabsContent>

        <TabsContent value="cam" className="outline-none space-y-4">
          <CamBillingView />
        </TabsContent>

        <TabsContent value="tickets" className="outline-none space-y-4">
          <ServiceTicketsView />
        </TabsContent>

        <TabsContent value="assets" className="outline-none space-y-4">
          <FacilityAssetsView />
        </TabsContent>
      </Tabs>

      <FacilityApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onHandoverProcessed={loadPendingApprovals}
      />
    </div>
  );
}

