"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { constructionApi, ContractorRaBill } from "@/services/constructionApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface ConstructionApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBillProcessed?: () => void;
}

export function ConstructionApprovalDrawer({
  isOpen,
  onClose,
  onBillProcessed,
}: ConstructionApprovalDrawerProps) {
  const mapItem = (bill: ContractorRaBill): GenericApprovalItem<ContractorRaBill> => ({
    id: bill.id,
    title: `${bill.contractorName} — Ref #${bill.billReference}`,
    subtitle: `Project: ${bill.projectName} | Phase: ${bill.wbsPhase}`,
    category: `Phase: ${bill.wbsPhase}`,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30 font-medium",
    amountFormatted: `₹${bill.netPayableLakhs.toLocaleString("en-IN")} Lakhs`,
    fields: [
      {
        label: "Gross Claim",
        value: `₹${bill.grossClaimLakhs.toLocaleString("en-IN")} L`,
        isMono: true,
      },
      {
        label: "Verified Value",
        value: `₹${bill.verifiedLakhs.toLocaleString("en-IN")} L`,
        isMono: true,
      },
      {
        label: "Holdback & GST",
        value: `Hold: ₹${bill.retainedHoldbackLakhs}L | GST: ₹${bill.gstLakhs}L`,
        isMono: true,
      },
      {
        label: "Progress Verified",
        value: `${bill.verifiedProgressPct}% (Claimed: ${bill.claimedProgressPct}%)`,
        isBadge: true,
        badgeVariant: "outline",
        badgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
      },
    ],
  });

  return (
    <ModularApprovalDrawer<ContractorRaBill>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onBillProcessed}
      headerBadge="EXECUTIVE GOVERNANCE"
      headerSubtitleBadge="RA BILL INTERCEPT"
      title="Project Director RA Bill Authorization Queue"
      description="Executive sign-off for contractor running account bills with site measurement variances > 5% or amounts > ₹50 Lakhs."
      icon={ShieldAlert}
      emptyTitle="Zero Pending RA Bill Approvals"
      emptyDescription="All contractor running account bills and physical site measurements have been certified."
      authorizeLabel="Authorize RA Bill"
      rejectLabel="Reject & Flag"
      rejectModalTitle="Reject Contractor RA Bill"
      rejectReasonPlaceholder="e.g. Flagged for physical re-measurement by Project Director..."
      defaultRejectReason="Flagged for physical re-measurement by Project Director"
      loadItems={() => constructionApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await constructionApi.authorizeRaBill(id);
        if (onBillProcessed) onBillProcessed();
      }}
      onReject={async (id, reason) => {
        await constructionApi.rejectRaBill(id, reason);
        if (onBillProcessed) onBillProcessed();
      }}
    />
  );
}
