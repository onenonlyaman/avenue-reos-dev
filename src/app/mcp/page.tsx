"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CorporatePageHeader
          title="MCP Server & AI Agent Governance Workspace"
          badgeText="AI AGENT GATEWAY"
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
            value="overview"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Bot className="h-3.5 w-3.5" />
            Agent Overview
          </TabsTrigger>

          <TabsTrigger
            value="tools"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Wrench className="h-3.5 w-3.5" />
            Registered MCP Tools
          </TabsTrigger>

          <TabsTrigger
            value="sessions"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Users className="h-3.5 w-3.5" />
            Active Agent Sessions
          </TabsTrigger>

          <TabsTrigger
            value="logs"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Activity className="h-3.5 w-3.5" />
            Execution Logs & Audits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="outline-none space-y-4 pt-2">
          <McpOverviewView />
        </TabsContent>

        <TabsContent value="tools" className="outline-none space-y-4 pt-2">
          <RegisteredToolsView />
        </TabsContent>

        <TabsContent value="sessions" className="outline-none space-y-4 pt-2">
          <AgentSessionsView />
        </TabsContent>

        <TabsContent value="logs" className="outline-none space-y-4 pt-2">
          <McpExecutionLogsView />
        </TabsContent>
      </Tabs>

      <McpApprovalDrawer
        isOpen={isHitlDrawerOpen}
        onClose={() => setIsHitlDrawerOpen(false)}
        onRefresh={checkPendingHitl}
      />
    </div>
  );
}

