"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { settingsApi, SecurityOverrideRequest } from "@/services/settingsApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface AdminApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOverrideProcessed: () => void;
}

export function AdminApprovalDrawer({
  isOpen,
  onClose,
  onOverrideProcessed,
}: AdminApprovalDrawerProps) {
  const mapItem = (req: SecurityOverrideRequest): GenericApprovalItem<SecurityOverrideRequest> => ({
    id: req.id,
    title: `Override Ref #${req.requestReference}`,
    subtitle: `Target: ${req.targetUserOrPolicy} | Requested by: ${req.requestingAdminName}`,
    category: req.modificationType,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-destructive/10 text-destructive dark:text-red-400 border-destructive/30 font-medium",
    justification: req.justification,
    fields: [
      {
        label: "Modification Type",
        value: req.modificationType,
        isMono: true,
      },
      {
        label: "Target Entity",
        value: req.targetUserOrPolicy,
      },
      {
        label: "Requesting Admin",
        value: req.requestingAdminName,
      },
    ],
  });

  return (
    <ModularApprovalDrawer<SecurityOverrideRequest>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onOverrideProcessed}
      headerBadge="SYSTEM GOVERNANCE DIRECTOR"
      headerSubtitleBadge="PRIVILEGE ELEVATION OVERRIDE"
      title="System Governance Security Override Queue"
      description="Executive sign-off required for privilege elevations, multi-tenant policy exceptions, and emergency bypass grants."
      icon={ShieldAlert}
      emptyTitle="Zero Pending Security Overrides"
      emptyDescription="All privilege elevations and security policy bypasses have been audited and resolved."
      authorizeLabel="Authorize Security Override"
      rejectLabel="Reject Override"
      rejectModalTitle="Reject Security Privilege Elevation"
      rejectReasonPlaceholder="e.g. Policy violation or excessive permission scope..."
      defaultRejectReason="Security override rejected by System Governance Director"
      loadItems={() => settingsApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await settingsApi.authorizeSecurityOverride(id);
        onOverrideProcessed();
      }}
      onReject={async (id, reason) => {
        await settingsApi.rejectSecurityOverride(id, reason);
        onOverrideProcessed();
      }}
    />
  );
}
