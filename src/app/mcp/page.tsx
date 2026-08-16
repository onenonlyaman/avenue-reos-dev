"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Wrench, Users, Activity, ShieldCheck } from "lucide-react";
import { McpOverviewView } from "@/components/modules/mcp/McpOverviewView";
import { RegisteredToolsView } from "@/components/modules/mcp/RegisteredToolsView";
import { AgentSessionsView } from "@/components/modules/mcp/AgentSessionsView";
import { McpExecutionLogsView } from "@/components/modules/mcp/McpExecutionLogsView";
import { McpApprovalDrawer } from "@/components/modules/mcp/McpApprovalDrawer";
import { mcpApi } from "@/services/mcpApi";

export default function McpPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isHitlDrawerOpen, setIsHitlDrawerOpen] = useState<boolean>(false);
  const [pendingHitlCount, setPendingHitlCount] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const checkPendingHitl = async () => {
    try {
      const pending = await mcpApi.getPendingApprovals();
      setPendingHitlCount(pending.length);
    } catch {
      setPendingHitlCount(0);
    }
  };

  useEffect(() => {
    checkPendingHitl();
  }, [refreshKey]);

  const handleQueueUpdated = () => {
    checkPendingHitl();
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="MCP Server & AI Agent Governance Workspace"
        badgeText="AI AGENT GATEWAY"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-semibold shrink-0 border-amber-500/40 bg-amber-500/10 text-foreground hover:bg-amber-500/20"
            onClick={() => setIsHitlDrawerOpen(true)}
          >
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            <span>Governance Escrow</span>
            {pendingHitlCount > 0 && (
              <Badge variant="default" className="ml-1 bg-amber-600 hover:bg-amber-600 text-white rounded-full px-1.5 py-0 text-[10px] font-mono font-bold">
                {pendingHitlCount}
              </Badge>
            )}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-lg h-10 w-full sm:w-auto flex overflow-x-auto justify-start">
          <TabsTrigger value="overview" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Bot className="h-3.5 w-3.5" />
            Agent Overview
          </TabsTrigger>

          <TabsTrigger value="tools" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Wrench className="h-3.5 w-3.5" />
            Registered MCP Tools
          </TabsTrigger>

          <TabsTrigger value="sessions" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Users className="h-3.5 w-3.5" />
            Active Agent Sessions
          </TabsTrigger>

          <TabsTrigger value="logs" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Activity className="h-3.5 w-3.5" />
            Execution Logs & Audits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="outline-none space-y-4">
          <McpOverviewView key={`overview-${refreshKey}`} onOpenGovernanceQueue={() => setIsHitlDrawerOpen(true)} />
        </TabsContent>

        <TabsContent value="tools" className="outline-none space-y-4">
          <RegisteredToolsView key={`tools-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="sessions" className="outline-none space-y-4">
          <AgentSessionsView key={`sessions-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="logs" className="outline-none space-y-4">
          <McpExecutionLogsView key={`logs-${refreshKey}`} />
        </TabsContent>
      </Tabs>

      <McpApprovalDrawer
        isOpen={isHitlDrawerOpen}
        onClose={() => setIsHitlDrawerOpen(false)}
        onRefresh={handleQueueUpdated}
      />
    </div>
  );
}
