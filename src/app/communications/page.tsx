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
      <CorporatePageHeader
        title="Unified Communications & Support Desk Workspace"
        badgeText="ENTERPRISE COMMUNICATIONS"
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
          <TabsTrigger value="chat" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <MessageSquare className="h-3.5 w-3.5" />
            Internal Workplace Chat
          </TabsTrigger>

          <TabsTrigger value="support" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Headset className="h-3.5 w-3.5" />
            Customer Support Desk
          </TabsTrigger>

          <TabsTrigger value="timeline" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <History className="h-3.5 w-3.5" />
            Customer Interaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="outline-none space-y-4">
          <InternalChatView />
        </TabsContent>

        <TabsContent value="support" className="outline-none space-y-4">
          <SupportDeskView />
        </TabsContent>

        <TabsContent value="timeline" className="outline-none space-y-4">
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

