"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { hrApi, HrApprovalItem } from "@/services/hrApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface HrApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function HrApprovalDrawer({ isOpen, onClose, onRefresh }: HrApprovalDrawerProps) {
  const mapItem = (item: HrApprovalItem): GenericApprovalItem<HrApprovalItem> => ({
    id: item.id,
    title: item.referenceName,
    subtitle: `Type: ${item.type} | Requested By: ${item.requestedBy}`,
    category: item.type,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    amount: item.amount > 0 ? item.amount : undefined,
    justification: item.justification,
    fields: [
      {
        label: "Requested By",
        value: item.requestedBy,
      },
      {
        label: "Operation Type",
        value: item.type,
        isMono: true,
      },
      {
        label: "Submission Date",
        value: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "Recent",
      },
    ],
  });

  return (
    <ModularApprovalDrawer<HrApprovalItem>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onRefresh}
      headerBadge="GOVERNANCE DIRECTIVE"
      headerSubtitleBadge="PAYROLL & DISBURSEMENT"
      title="Governance Director Payroll & Compensation Authorization Queue"
      description="Mandatory executive dual-control sign-off for bulk monthly payroll batches and individual salary elevation requests."
      icon={ShieldCheck}
      emptyTitle="Zero Pending HR Approvals"
      emptyDescription="All monthly payroll batches and salary adjustments have been verified and disbursed."
      authorizeLabel="Authorize Disbursement Batch"
      rejectLabel="Reject Batch"
      rejectModalTitle="Reject Payroll / Compensation Request"
      rejectReasonPlaceholder="e.g. Disbursement exceeds quarterly budget allocation / Requires manual review..."
      defaultRejectReason="Rejected by Governance Director"
      loadItems={() => hrApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await hrApi.authorizeApproval(id);
      }}
      onReject={async (id, reason) => {
        await hrApi.rejectApproval(id, reason);
      }}
    />
  );
}
