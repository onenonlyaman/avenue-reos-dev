"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Database, MessageSquare, Scale, Activity, ShieldCheck } from "lucide-react";
import { PaymentErpSyncView } from "@/components/modules/integrations/PaymentErpSyncView";
import { CommunicationsIntegrationsView } from "@/components/modules/integrations/CommunicationsIntegrationsView";
import { HardwareWorkspaceView } from "@/components/modules/integrations/HardwareWorkspaceView";
import { IntegrationLogsView } from "@/components/modules/integrations/IntegrationLogsView";
import { IntegrationsApprovalDrawer } from "@/components/modules/integrations/IntegrationsApprovalDrawer";
import { integrationsApi } from "@/services/integrationsApi";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<string>("erp");
  const [isHitlDrawerOpen, setIsHitlDrawerOpen] = useState<boolean>(false);
  const [pendingHitlCount, setPendingHitlCount] = useState<number>(0);

  const checkPendingHitl = async () => {
    try {
      const pending = await integrationsApi.getPendingApprovals();
      setPendingHitlCount(pending.length);
    } catch {
      setPendingHitlCount(0);
    }
  };

  useEffect(() => {
    checkPendingHitl();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CorporatePageHeader
          title="Third-Party Integrations & Connectors Workspace"
          badgeText="SYSTEM INTEGRATIONS"
        />

        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs font-semibold shrink-0 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
          onClick={() => setIsHitlDrawerOpen(true)}
        >
          <ShieldCheck className="h-4 w-4 text-amber-700" />
          <span>Governance Queue</span>
          {pendingHitlCount > 0 && (
            <span className="ml-1 bg-amber-700 text-white rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold">
              {pendingHitlCount}
            </span>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="w-full h-auto flex flex-wrap border-b border-border bg-transparent p-0 gap-1">
          <TabsTrigger
            value="erp"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Database className="h-3.5 w-3.5" />
            Payment & ERP Sync
          </TabsTrigger>

          <TabsTrigger
            value="comms"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Communications & IVR
          </TabsTrigger>

          <TabsTrigger
            value="hardware"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Scale className="h-3.5 w-3.5" />
            Workspace & Hardware APIs
          </TabsTrigger>

          <TabsTrigger
            value="logs"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Activity className="h-3.5 w-3.5" />
            Integration Sync Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="erp" className="outline-none space-y-4 pt-2">
          <PaymentErpSyncView onOpenHitlDrawer={() => setIsHitlDrawerOpen(true)} />
        </TabsContent>

        <TabsContent value="comms" className="outline-none space-y-4 pt-2">
          <CommunicationsIntegrationsView />
        </TabsContent>

        <TabsContent value="hardware" className="outline-none space-y-4 pt-2">
          <HardwareWorkspaceView />
        </TabsContent>

        <TabsContent value="logs" className="outline-none space-y-4 pt-2">
          <IntegrationLogsView />
        </TabsContent>
      </Tabs>

      <IntegrationsApprovalDrawer
        isOpen={isHitlDrawerOpen}
        onClose={() => setIsHitlDrawerOpen(false)}
        onRefresh={checkPendingHitl}
      />
    </div>
  );
}

