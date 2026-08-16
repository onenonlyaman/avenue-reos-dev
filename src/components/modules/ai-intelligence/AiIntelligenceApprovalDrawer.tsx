"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { aiIntelligenceApi, AiIntelligenceApprovalItem } from "@/services/aiIntelligenceApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface AiIntelligenceApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function AiIntelligenceApprovalDrawer({ isOpen, onClose, onRefresh }: AiIntelligenceApprovalDrawerProps) {
  const mapItem = (item: AiIntelligenceApprovalItem): GenericApprovalItem<AiIntelligenceApprovalItem> => ({
    id: item.id,
    title: item.title,
    subtitle: `Target: ${item.targetReference}`,
    category: item.category,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    amount: item.amount > 0 ? item.amount : undefined,
    justification: item.justification,
  });

  return (
    <ModularApprovalDrawer<AiIntelligenceApprovalItem>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onRefresh}
      headerBadge="GOVERNANCE DIRECTIVE"
      headerSubtitleBadge="HITL AI VERIFICATION"
      title="Governance Director AI Intelligence Verification Queue"
      description="Human-in-the-Loop executive verification for legal deeds, fraud alerts, and commodity buy recommendations (> ₹10 Lakhs)."
      icon={ShieldCheck}
      emptyTitle="No Pending AI Verification Requests"
      emptyDescription="All AI generated legal deeds, fraud alerts, and high-value commodity recommendations have been reviewed and authorized."
      authorizeLabel="Authorize AI Generation"
      rejectLabel="Reject AI Output"
      rejectModalTitle="Reject AI Output Verification"
      rejectReasonPlaceholder="e.g. Terms require revision before deed issuance..."
      defaultRejectReason="Rejected by Governance Director"
      loadItems={() => aiIntelligenceApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await aiIntelligenceApi.authorizeApproval(id);
      }}
      onReject={async (id, reason) => {
        await aiIntelligenceApi.rejectApproval(id, reason);
      }}
    />
  );
}
