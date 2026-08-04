"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Landmark, Handshake, FileCheck, ShieldAlert } from "lucide-react";
import { LandAcquisitionView } from "@/components/modules/legal/LandAcquisitionView";
import { JointVenturesView } from "@/components/modules/legal/JointVenturesView";
import { ReraComplianceView } from "@/components/modules/legal/ReraComplianceView";
import { TitleLitigationView } from "@/components/modules/legal/TitleLitigationView";
import { LegalApprovalDrawer } from "@/components/modules/legal/LegalApprovalDrawer";
import { legalApi } from "@/services/legalApi";

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<string>("parcels");
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState<boolean>(false);

  const loadPendingApprovals = async () => {
    try {
      const res = await legalApi.getPendingApprovals();
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
        title="Land Acquisition, JDA & Regulatory Compliance Workspace"
        badgeText="LEGAL & REGULATORY ERP"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 font-medium"
            onClick={() => setIsApprovalDrawerOpen(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
            Legal Committee Queue
            <Badge variant="secondary" className="bg-amber-200 text-amber-950 text-[9px] px-1 py-0 ml-0.5 font-bold">
              {pendingApprovalsCount}
            </Badge>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="w-full h-auto flex flex-wrap border-b border-border bg-transparent p-0 gap-1">
          <TabsTrigger
            value="parcels"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Landmark className="h-3.5 w-3.5" />
            Land Bank & Sourcing
          </TabsTrigger>

          <TabsTrigger
            value="jdas"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Handshake className="h-3.5 w-3.5" />
            Joint Development Agreements
          </TabsTrigger>

          <TabsTrigger
            value="rera"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <FileCheck className="h-3.5 w-3.5" />
            MahaRERA Compliance
          </TabsTrigger>

          <TabsTrigger
            value="title"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Title & Litigation Tracker
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parcels" className="outline-none space-y-4 pt-2">
          <LandAcquisitionView />
        </TabsContent>

        <TabsContent value="jdas" className="outline-none space-y-4 pt-2">
          <JointVenturesView />
        </TabsContent>

        <TabsContent value="rera" className="outline-none space-y-4 pt-2">
          <ReraComplianceView />
        </TabsContent>

        <TabsContent value="title" className="outline-none space-y-4 pt-2">
          <TitleLitigationView />
        </TabsContent>
      </Tabs>

      <LegalApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onParcelProcessed={loadPendingApprovals}
      />
    </div>
  );
}

