"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { facilityApi, UnitHandover } from "@/services/facilityApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface FacilityApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onHandoverProcessed: () => void;
}

export function FacilityApprovalDrawer({
  isOpen,
  onClose,
  onHandoverProcessed,
}: FacilityApprovalDrawerProps) {
  const mapItem = (h: UnitHandover): GenericApprovalItem<UnitHandover> => ({
    id: h.id,
    title: `Unit ${h.unitName} — ${h.buyerName}`,
    subtitle: `Ref: ${h.handoverReference}`,
    category: h.status === "PENDING_APPROVAL" ? "DEFECT OVERRIDE" : h.status,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    justification: h.rejectionReason || undefined,
    fields: [
      {
        label: "Desnagging Completion",
        value: `${h.desnaggingCompletionPct}% Complete`,
        isMono: true,
      },
      {
        label: "Outstanding Balance",
        value: `₹${h.outstandingBalance.toLocaleString("en-IN")}`,
        isMono: true,
      },
      {
        label: "Target Handover Date",
        value: new Date(h.targetHandoverDate).toLocaleDateString("en-IN"),
      },
      {
        label: "Financial NOC",
        value: h.financialNocCleared ? "NOC CLEARED" : "NOC PENDING",
        isBadge: true,
        badgeVariant: "outline",
        badgeClassName: h.financialNocCleared
          ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-medium"
          : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
      },
    ],
  });

  return (
    <ModularApprovalDrawer<UnitHandover>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onHandoverProcessed}
      headerBadge="OPERATIONS DIRECTOR GOVERNANCE"
      headerSubtitleBadge="HANDOVER OVERRIDE QUEUE"
      title="Operations Director Possession Handover Queue"
      description="Review units with open snag items requiring executive sign-off before key handover & possession issuance."
      icon={ShieldAlert}
      emptyTitle="Zero Pending Handover Overrides"
      emptyDescription="All unit possession handovers have passed defect checklists or have already been authorized."
      authorizeLabel="Authorize Handover"
      rejectLabel="Reject & Hold"
      rejectModalTitle="Reject Handover Possession"
      rejectReasonPlaceholder="e.g. Mandatory rectifications required for plumbing snags before keys release..."
      defaultRejectReason="Handover held for physical rectification by Operations Director"
      loadItems={() => facilityApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await facilityApi.authorizeHandover(id);
        onHandoverProcessed();
      }}
      onReject={async (id, reason) => {
        await facilityApi.rejectHandover(id, reason);
        onHandoverProcessed();
      }}
    />
  );
}
