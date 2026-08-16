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
        <TabsList className="bg-muted/50 p-1 border border-border rounded-lg h-10 w-full sm:w-auto flex overflow-x-auto justify-start">
          <TabsTrigger value="diagnostics" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Activity className="h-3.5 w-3.5" />
            Operational Diagnostics
          </TabsTrigger>

          <TabsTrigger value="hitl" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <ShieldAlert className="h-3.5 w-3.5" />
            HITL Governance Matrix
          </TabsTrigger>

          <TabsTrigger value="bus" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Radio className="h-3.5 w-3.5" />
            Event Bus Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="outline-none space-y-4">
          <SystemHealthView />
        </TabsContent>

        <TabsContent value="hitl" className="outline-none space-y-4">
          <HitlAuditSummaryView />
        </TabsContent>

        <TabsContent value="bus" className="outline-none space-y-4">
          <EventStreamMonitorView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

