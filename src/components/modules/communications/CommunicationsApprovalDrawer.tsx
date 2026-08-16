"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { communicationsApi, CommunicationsApprovalItem } from "@/services/communicationsApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface CommunicationsApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function CommunicationsApprovalDrawer({ isOpen, onClose, onRefresh }: CommunicationsApprovalDrawerProps) {
  const mapItem = (item: CommunicationsApprovalItem): GenericApprovalItem<CommunicationsApprovalItem> => ({
    id: item.id,
    title: item.customerName,
    subtitle: `Ref: ${item.ticketReference} | Issue: ${item.issueSummary}`,
    category: "CUSTOMER DISPUTE",
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    amount: item.claimAmount > 0 ? item.claimAmount : undefined,
    justification: item.justification,
    fields: [
      {
        label: "Ticket Ref",
        value: item.ticketReference,
        isMono: true,
      },
      {
        label: "Customer",
        value: item.customerName,
      },
      {
        label: "Claim Amount",
        value: item.claimAmount > 0 ? `₹${item.claimAmount.toLocaleString("en-IN")}` : "Non-Financial",
        isMono: true,
      },
    ],
  });

  return (
    <ModularApprovalDrawer<CommunicationsApprovalItem>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onRefresh}
      headerBadge="GOVERNANCE DIRECTIVE"
      headerSubtitleBadge="TICKET ESCALATION"
      title="Customer Governance Director Escalation Queue"
      description="Executive review for buyer financial claim disputes (> ₹1 Lakh) and legal notice threat escalations."
      icon={ShieldCheck}
      emptyTitle="No Pending Dispute Escalations"
      emptyDescription="All customer disputes, compensation claims, and legal threats have been resolved."
      authorizeLabel="Authorize Dispute Settlement"
      rejectLabel="Reject Claim"
      rejectModalTitle="Reject Dispute Claim"
      rejectReasonPlaceholder="e.g. Terms indicate buyer liability or non-statutory claim..."
      defaultRejectReason="Rejected by Customer Governance Director"
      loadItems={() => communicationsApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await communicationsApi.authorizeApproval(id);
      }}
      onReject={async (id, reason) => {
        await communicationsApi.rejectApproval(id, reason);
      }}
    />
  );
}
