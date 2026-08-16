"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { mcpApi, McpApprovalItem } from "@/services/mcpApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface McpApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function McpApprovalDrawer({ isOpen, onClose, onRefresh }: McpApprovalDrawerProps) {
  const mapItem = (item: McpApprovalItem): GenericApprovalItem<McpApprovalItem> => ({
    id: item.id,
    title: `${item.agentTitle} — ${item.invokedTool}`,
    subtitle: `Target Module: ${item.targetModule}`,
    category: "AI TOOL INTERCEPT",
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    justification: item.justification,
    fields: [
      {
        label: "Tool Function",
        value: item.invokedTool,
        isMono: true,
      },
      {
        label: "Target Module",
        value: item.targetModule,
      },
      {
        label: "Parameters Summary",
        value: item.parametersSummary,
        isMono: true,
        colSpan: 2,
      },
    ],
  });

  return (
    <ModularApprovalDrawer<McpApprovalItem>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onRefresh}
      headerBadge="GOVERNANCE DIRECTIVE"
      headerSubtitleBadge="MCP AI SAFETY PROTOCOL"
      title="Governance Director AI & MCP Tool Verification Queue"
      description="Autonomous agent execution queue for sensitive tool calls (database mutations, ERP write-backs, and financial payments)."
      icon={ShieldCheck}
      emptyTitle="Zero Pending MCP Intercepts"
      emptyDescription="All autonomous agent tool calls have executed safely or have already been authorized."
      authorizeLabel="Authorize AI Tool Execution"
      rejectLabel="Deny Execution"
      rejectModalTitle="Deny AI Tool Call Execution"
      rejectReasonPlaceholder="e.g. Unsafe parameter arguments or invalid mutation scope..."
      defaultRejectReason="Denied by Governance Director"
      loadItems={() => mcpApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await mcpApi.authorizeApproval(id);
      }}
      onReject={async (id, reason) => {
        await mcpApi.rejectApproval(id, reason);
      }}
    />
  );
}
