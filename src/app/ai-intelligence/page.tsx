"use client";

import React, { useState, useEffect } from "react";
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

  const checkPendingHitl = async () => {
    try {
      const pending = await aiIntelligenceApi.getPendingApprovals();
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
          title="Specialized Native AI Microservices & Domain Intelligence Workspace"
          badgeText="DOMAIN AI SERVICES"
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
            value="documents"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <FileText className="h-3.5 w-3.5" />
            Document & Legal AI
          </TabsTrigger>

          <TabsTrigger
            value="safety"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Camera className="h-3.5 w-3.5" />
            Site Safety & Construction AI
          </TabsTrigger>

          <TabsTrigger
            value="finance"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Procurement & Financial AI
          </TabsTrigger>

          <TabsTrigger
            value="risk"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Risk & Market Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="outline-none space-y-4 pt-2">
          <DocumentLegalAiView onOpenHitlDrawer={() => setIsHitlDrawerOpen(true)} />
        </TabsContent>

        <TabsContent value="safety" className="outline-none space-y-4 pt-2">
          <ConstructionSafetyAiView />
        </TabsContent>

        <TabsContent value="finance" className="outline-none space-y-4 pt-2">
          <FinanceProcurementAiView />
        </TabsContent>

        <TabsContent value="risk" className="outline-none space-y-4 pt-2">
          <RiskMarketIntelligenceView />
        </TabsContent>
      </Tabs>

      <AiIntelligenceApprovalDrawer
        isOpen={isHitlDrawerOpen}
        onClose={() => setIsHitlDrawerOpen(false)}
        onRefresh={checkPendingHitl}
      />
    </div>
  );
}

