"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { financeApi, PendingDisbursement } from "@/services/financeApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface FinanceApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDisbursementProcessed?: () => void;
}

export function FinanceApprovalDrawer({
  isOpen,
  onClose,
  onDisbursementProcessed,
}: FinanceApprovalDrawerProps) {
  const mapItem = (d: PendingDisbursement): GenericApprovalItem<PendingDisbursement> => ({
    id: d.id,
    title: d.vendorOrRecipient,
    subtitle: `Ref #${d.requestNumber} | Project: ${d.projectName}`,
    category: d.costCenter || "TREASURY DISBURSEMENT",
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    amountFormatted: `₹${d.amountLakhs.toLocaleString("en-IN")} Lakhs`,
    justification: d.reason,
    fields: [
      {
        label: "Requested By",
        value: d.requestedBy,
      },
      {
        label: "Request Date",
        value: new Date(d.requestDate).toLocaleDateString("en-IN"),
      },
      {
        label: "Document Ref",
        value: d.documentRef,
        isMono: true,
      },
    ],
  });

  return (
    <ModularApprovalDrawer<PendingDisbursement>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onDisbursementProcessed}
      headerBadge="EXECUTIVE CFO DISBURSEMENT CONTROL"
      headerSubtitleBadge="TREASURY HITL"
      title="CFO Financial Disbursement Authorization Queue"
      description="Dual-control authorization required for all treasury payouts exceeding ₹15 Lakhs ($18k+) or unbudgeted capital outflows."
      icon={ShieldAlert}
      emptyTitle="Zero Pending CFO Disbursements"
      emptyDescription="All high-value vendor disbursements and wire payouts have been verified and processed."
      authorizeLabel="Authorize Payout"
      rejectLabel="Reject Payment"
      rejectModalTitle="Reject Financial Disbursement"
      rejectReasonPlaceholder="e.g. Discrepancy in supplier bank beneficiary code or milestone audit..."
      defaultRejectReason="Disbursement rejected by Executive CFO"
      loadItems={() => financeApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await financeApi.authorizeDisbursement(id);
        if (onDisbursementProcessed) onDisbursementProcessed();
      }}
      onReject={async (id, reason) => {
        await financeApi.rejectDisbursement(id, reason);
        if (onDisbursementProcessed) onDisbursementProcessed();
      }}
    />
  );
}
