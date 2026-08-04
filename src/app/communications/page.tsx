"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageSquare, Headset, History, ShieldCheck } from "lucide-react";
import { InternalChatView } from "@/components/modules/communications/InternalChatView";
import { SupportDeskView } from "@/components/modules/communications/SupportDeskView";
import { CustomerTimelineView } from "@/components/modules/communications/CustomerTimelineView";
import { CommunicationsApprovalDrawer } from "@/components/modules/communications/CommunicationsApprovalDrawer";
import { communicationsApi } from "@/services/communicationsApi";

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [isHitlDrawerOpen, setIsHitlDrawerOpen] = useState<boolean>(false);
  const [pendingHitlCount, setPendingHitlCount] = useState<number>(0);

  const checkPendingHitl = async () => {
    try {
      const pending = await communicationsApi.getPendingApprovals();
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
          title="Unified Communications & Support Desk Workspace"
          badgeText="ENTERPRISE COMMUNICATIONS"
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
            value="chat"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Internal Workplace Chat
          </TabsTrigger>

          <TabsTrigger
            value="support"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Headset className="h-3.5 w-3.5" />
            Customer Support Desk
          </TabsTrigger>

          <TabsTrigger
            value="timeline"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <History className="h-3.5 w-3.5" />
            Customer Interaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="outline-none space-y-4 pt-2">
          <InternalChatView />
        </TabsContent>

        <TabsContent value="support" className="outline-none space-y-4 pt-2">
          <SupportDeskView />
        </TabsContent>

        <TabsContent value="timeline" className="outline-none space-y-4 pt-2">
          <CustomerTimelineView />
        </TabsContent>
      </Tabs>

      <CommunicationsApprovalDrawer
        isOpen={isHitlDrawerOpen}
        onClose={() => setIsHitlDrawerOpen(false)}
        onRefresh={checkPendingHitl}
      />
    </div>
  );
}

