"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { usersApi, UserApprovalItem } from "@/services/usersApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface UserApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function UserApprovalDrawer({ isOpen, onClose, onRefresh }: UserApprovalDrawerProps) {
  const mapItem = (item: UserApprovalItem): GenericApprovalItem<UserApprovalItem> => ({
    id: item.id,
    title: item.targetUserName,
    subtitle: `Target User ID: ${item.userId || "New Registration"}`,
    category: `Requested Role: ${item.requestedRole}`,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    amountFormatted: item.requestedFinancialLimit > 0 ? `Limit: ₹${item.requestedFinancialLimit.toLocaleString("en-IN")}` : undefined,
    justification: item.justification,
    fields: [
      {
        label: "Target User",
        value: item.targetUserName,
      },
      {
        label: "Requested Role",
        value: item.requestedRole,
        isMono: true,
      },
      {
        label: "Financial Authority",
        value: item.requestedFinancialLimit > 0 ? `₹${item.requestedFinancialLimit.toLocaleString("en-IN")}` : "Standard",
        isMono: true,
      },
    ],
  });

  return (
    <ModularApprovalDrawer<UserApprovalItem>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onRefresh}
      headerBadge="GOVERNANCE DIRECTIVE"
      headerSubtitleBadge="USER IDENTITY CONTROL"
      title="Governance Director User Authorization Queue"
      description="Executive authorization queue for new internal user registration and role access elevations."
      icon={ShieldCheck}
      emptyTitle="Zero Pending User Approvals"
      emptyDescription="All user access requests and role elevations have been verified."
      authorizeLabel="Authorize User Role"
      rejectLabel="Reject Request"
      rejectModalTitle="Reject User Access Request"
      rejectReasonPlaceholder="e.g. Ineligible role elevation or unverified department identity..."
      defaultRejectReason="Rejected by Governance Director"
      loadItems={() => usersApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await usersApi.authorizeApproval(id);
      }}
      onReject={async (id, reason) => {
        await usersApi.rejectApproval(id, reason);
      }}
    />
  );
}
