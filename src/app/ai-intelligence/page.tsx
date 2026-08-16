"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, Camera, ShoppingBag, ShieldAlert, ShieldCheck } from "lucide-react";
import { DocumentLegalAiView } from "@/components/modules/ai-intelligence/DocumentLegalAiView";
import { ConstructionSafetyAiView } from "@/components/modules/ai-intelligence/ConstructionSafetyAiView";
import { FinanceProcurementAiView } from "@/components/modules/ai-intelligence/FinanceProcurementAiView";
import { RiskMarketIntelligenceView } from "@/components/modules/ai-intelligence/RiskMarketIntelligenceView";
import { AiIntelligenceApprovalDrawer } from "@/components/modules/ai-intelligence/AiIntelligenceApprovalDrawer";
import { aiIntelligenceApi } from "@/services/aiIntelligenceApi";

export default function AiIntelligencePage() {
  const [activeTab, setActiveTab] = useState<string>("documents");
  const [isHitlDrawerOpen, setIsHitlDrawerOpen] = useState<boolean>(false);
  const [pendingHitlCount, setPendingHitlCount] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const checkPendingHitl = useCallback(async () => {
    try {
      const pending = await aiIntelligenceApi.getPendingApprovals();
      setPendingHitlCount(pending.length);
    } catch {
      setPendingHitlCount(0);
    }
  }, []);

  const handleQueueRefresh = () => {
    checkPendingHitl();
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    checkPendingHitl();
  }, [checkPendingHitl]);

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="Specialized Native AI Microservices & Domain Intelligence Workspace"
        badgeText="DOMAIN AI SERVICES"
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
          <TabsTrigger value="documents" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <FileText className="h-3.5 w-3.5" />
            Document & Legal AI
          </TabsTrigger>

          <TabsTrigger value="safety" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Camera className="h-3.5 w-3.5" />
            Site Safety & Construction AI
          </TabsTrigger>

          <TabsTrigger value="finance" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <ShoppingBag className="h-3.5 w-3.5" />
            Procurement & Financial AI
          </TabsTrigger>

          <TabsTrigger value="risk" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <ShieldAlert className="h-3.5 w-3.5" />
            Risk & Market Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="outline-none space-y-4">
          <DocumentLegalAiView
            key={`docs-${refreshKey}`}
            onOpenHitlDrawer={() => {
              checkPendingHitl();
              setIsHitlDrawerOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="safety" className="outline-none space-y-4">
          <ConstructionSafetyAiView key={`safety-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="finance" className="outline-none space-y-4">
          <FinanceProcurementAiView key={`fin-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="risk" className="outline-none space-y-4">
          <RiskMarketIntelligenceView key={`risk-${refreshKey}`} />
        </TabsContent>
      </Tabs>

      <AiIntelligenceApprovalDrawer
        isOpen={isHitlDrawerOpen}
        onClose={() => setIsHitlDrawerOpen(false)}
        onRefresh={handleQueueRefresh}
      />
    </div>
  );
}
