"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { integrationsApi, IntegrationsApprovalItem } from "@/services/integrationsApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface IntegrationsApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function IntegrationsApprovalDrawer({ isOpen, onClose, onRefresh }: IntegrationsApprovalDrawerProps) {
  const mapItem = (item: IntegrationsApprovalItem): GenericApprovalItem<IntegrationsApprovalItem> => ({
    id: item.id,
    title: item.connectorName,
    subtitle: `Action: ${item.actionType}`,
    category: item.actionType,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    amount: item.syncAmount > 0 ? item.syncAmount : undefined,
    justification: item.justification,
    fields: [
      {
        label: "Connector",
        value: item.connectorName,
      },
      {
        label: "Action Type",
        value: item.actionType,
        isMono: true,
      },
      {
        label: "Timestamp",
        value: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "Recent",
      },
    ],
  });

  return (
    <ModularApprovalDrawer<IntegrationsApprovalItem>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onRefresh}
      headerBadge="GOVERNANCE DIRECTIVE"
      headerSubtitleBadge="INTEGRATIONS & GATEWAYS"
      title="Governance Director Integration Safeguard Queue"
      description="Executive authorization for high-value ERP ledger syncs (> ₹10 Lakhs), gateway refunds (> ₹50,000), and API vault key rotations."
      icon={ShieldCheck}
      emptyTitle="No Pending Integration Approvals"
      emptyDescription="All ERP syncs, gateway operations, and webhooks have executed normally."
      authorizeLabel="Authorize Execution"
      rejectLabel="Reject & Abort"
      rejectModalTitle="Reject Integration Operation"
      rejectReasonPlaceholder="e.g. Discrepancy in target ERP endpoint or unapproved refund request..."
      defaultRejectReason="Rejected by Governance Director"
      loadItems={() => integrationsApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await integrationsApi.authorizeApproval(id);
      }}
      onReject={async (id) => {
        await integrationsApi.rejectApproval(id, "Rejected by Governance Director");
      }}
    />
  );
}
