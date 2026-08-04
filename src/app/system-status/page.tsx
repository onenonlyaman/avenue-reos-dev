"use client";

import React, { useState } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, ShieldAlert, Radio } from "lucide-react";
import { SystemHealthView } from "@/components/modules/system-status/SystemHealthView";
import { HitlAuditSummaryView } from "@/components/modules/system-status/HitlAuditSummaryView";
import { EventStreamMonitorView } from "@/components/modules/system-status/EventStreamMonitorView";

export default function SystemStatusPage() {
  const [activeTab, setActiveTab] = useState<string>("diagnostics");

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="Production Integration & System Health Lock"
        badgeText="SRE DIAGNOSTICS"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="w-full h-auto flex flex-wrap border-b border-border bg-transparent p-0 gap-1">
          <TabsTrigger
            value="diagnostics"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Activity className="h-3.5 w-3.5" />
            Operational Diagnostics
          </TabsTrigger>

          <TabsTrigger
            value="hitl"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            HITL Governance Matrix
          </TabsTrigger>

          <TabsTrigger
            value="bus"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Radio className="h-3.5 w-3.5" />
            Event Bus Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="outline-none space-y-4 pt-2">
          <SystemHealthView />
        </TabsContent>

        <TabsContent value="hitl" className="outline-none space-y-4 pt-2">
          <HitlAuditSummaryView />
        </TabsContent>

        <TabsContent value="bus" className="outline-none space-y-4 pt-2">
          <EventStreamMonitorView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

