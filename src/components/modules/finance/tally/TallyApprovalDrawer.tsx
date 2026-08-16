"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { tallyErpApi, TallyVoucher } from "@/services/tallyErpApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface TallyApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function TallyApprovalDrawer({ isOpen, onClose, onRefresh }: TallyApprovalDrawerProps) {
  const mapItem = (v: TallyVoucher): GenericApprovalItem<TallyVoucher> => ({
    id: v.id,
    title: `Voucher #${v.voucherNumber}`,
    subtitle: `Type: ${v.voucherType} | Date: ${v.postingDate ? v.postingDate.split("T")[0] : "N/A"}`,
    category: "Threshold > ₹10 Lakhs",
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    amountFormatted: `₹${v.totalAmount.toLocaleString("en-IN")}`,
    justification: v.narration || undefined,
    fields: [
      {
        label: "Debit Ledger",
        value: v.debitLedgerName || "N/A",
      },
      {
        label: "Credit Ledger",
        value: v.creditLedgerName || "N/A",
      },
      {
        label: "Book Scope",
        value: v.bookType || "STATUTORY",
        isBadge: true,
        badgeVariant: "outline",
        badgeClassName: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30 font-medium",
      },
      {
        label: "Posting Status",
        value: v.status || "PENDING",
        isBadge: true,
        badgeVariant: "outline",
        badgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
      },
    ],
  });

  return (
    <ModularApprovalDrawer<TallyVoucher>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onRefresh}
      headerBadge="FINANCIAL GOVERNANCE"
      headerSubtitleBadge="TALLY ERP HITL"
      title="Governance Director HITL Financial Intercepts"
      description="Review and authorize vouchers exceeding ₹10 Lakhs, PO budget encumbrances, or manual overrides."
      icon={ShieldAlert}
      emptyTitle="Zero Pending HITL Intercepts"
      emptyDescription="All financial vouchers have been processed or authorized."
      authorizeLabel="Authorize Ledger Posting"
      rejectLabel="Reject Financial Voucher"
      rejectModalTitle="Reject Tally Financial Voucher"
      rejectReasonPlaceholder="e.g. Audit reconciliation mismatch or unapproved cost center..."
      defaultRejectReason="Voucher rejected by Governance Director"
      loadItems={() => tallyErpApi.fetchPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await tallyErpApi.authorizeVoucher(id);
        if (onRefresh) onRefresh();
      }}
      onReject={async (id) => {
        await tallyErpApi.rejectVoucher(id);
        if (onRefresh) onRefresh();
      }}
    />
  );
}
