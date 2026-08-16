"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { legalApi, LandParcel } from "@/services/legalApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface LegalApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onParcelProcessed: () => void;
}

export function LegalApprovalDrawer({
  isOpen,
  onClose,
  onParcelProcessed,
}: LegalApprovalDrawerProps) {
  const mapItem = (p: LandParcel): GenericApprovalItem<LandParcel> => ({
    id: p.id,
    title: p.parcelReference,
    subtitle: `${p.parcelDescription} | Zone: ${p.locationZone}`,
    category: p.titleStatus,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    amountFormatted: `₹${p.totalOutlayLakhs.toLocaleString("en-IN")} Lakhs`,
    justification: p.rejectionReason || undefined,
    fields: [
      {
        label: "Plot Area",
        value: `${p.plotAreaAcres} Acres (${p.plotAreaSqft.toLocaleString("en-IN")} sqft)`,
        isMono: true,
      },
      {
        label: "Constructible",
        value: `${p.constructibleSqft.toLocaleString("en-IN")} sqft (FSI ${p.applicableFsi})`,
        isMono: true,
      },
      {
        label: "Title Status",
        value: p.titleStatus,
        isBadge: true,
        badgeVariant: "outline",
        badgeClassName:
          p.titleStatus === "Clear Title"
            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-medium"
            : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
      },
    ],
  });

  return (
    <ModularApprovalDrawer<LandParcel>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onParcelProcessed}
      headerBadge="LEGAL COMMITTEE GOVERNANCE"
      headerSubtitleBadge="HIGH-VALUE PARCEL SIGN-OFF"
      title="Statutory Legal & Land Committee Approval Queue"
      description="Executive sign-off required for land acquisitions exceeding ₹10 Crore, disputed encumbrance clearance, or joint-development deed execution."
      icon={ShieldAlert}
      emptyTitle="Zero Pending Land Approvals"
      emptyDescription="All strategic land parcel acquisitions and title searches have been reviewed and approved."
      authorizeLabel="Authorize Land Acquisition"
      rejectLabel="Reject Proposal"
      rejectModalTitle="Reject Land Parcel Acquisition"
      rejectReasonPlaceholder="e.g. Encumbrance dispute on survey number 42 or lack of statutory access clearance..."
      defaultRejectReason="Acquisition proposal rejected by Legal Committee"
      requireRejectReason={true}
      loadItems={() => legalApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await legalApi.authorizeAcquisition(id);
        onParcelProcessed();
      }}
      onReject={async (id, reason) => {
        await legalApi.rejectAcquisition(id, reason);
        onParcelProcessed();
      }}
    />
  );
}
