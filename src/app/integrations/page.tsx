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
      <CorporatePageHeader
        title="Third-Party Integrations & Connectors Workspace"
        badgeText="SYSTEM INTEGRATIONS"
        actions={
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
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-lg h-10 w-full sm:w-auto flex overflow-x-auto justify-start">
          <TabsTrigger value="erp" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Database className="h-3.5 w-3.5" />
            Payment & ERP Sync
          </TabsTrigger>

          <TabsTrigger value="comms" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <MessageSquare className="h-3.5 w-3.5" />
            Communications & IVR
          </TabsTrigger>

          <TabsTrigger value="hardware" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Scale className="h-3.5 w-3.5" />
            Workspace & Hardware APIs
          </TabsTrigger>

          <TabsTrigger value="logs" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Activity className="h-3.5 w-3.5" />
            Integration Sync Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="erp" className="outline-none space-y-4">
          <PaymentErpSyncView
            onOpenHitlDrawer={() => setIsHitlDrawerOpen(true)}
            onSyncTriggered={checkPendingHitl}
          />
        </TabsContent>

        <TabsContent value="comms" className="outline-none space-y-4">
          <CommunicationsIntegrationsView />
        </TabsContent>

        <TabsContent value="hardware" className="outline-none space-y-4">
          <HardwareWorkspaceView />
        </TabsContent>

        <TabsContent value="logs" className="outline-none space-y-4">
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
