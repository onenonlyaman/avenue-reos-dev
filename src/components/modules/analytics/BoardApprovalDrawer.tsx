"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordFormModal, RecordField } from "@/components/core/RecordFormModal";
import { ShieldAlert, Plus } from "lucide-react";
import { analyticsApi, CapitalAllocationRequest } from "@/services/analyticsApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

const CAPITAL_FIELDS: RecordField[] = [
  {
    name: "projectName",
    label: "Target Project / Development Site",
    type: "text",
    required: true,
    placeholder: "e.g. Avenue Grandeur Phase 2",
  },
  {
    name: "requestedCapitalLakhs",
    label: "Requested Capital Deployment (₹ Lakhs)",
    type: "number",
    required: true,
    placeholder: "e.g. 250 (equals ₹2.5 Crore)",
    halfWidth: true,
  },
  {
    name: "riskRating",
    label: "Underwriting Risk Rating",
    type: "select",
    required: true,
    options: [
      { value: "Low", label: "Low Risk" },
      { value: "Medium", label: "Medium Risk" },
      { value: "High / Critical", label: "High / Critical Risk" },
    ],
    halfWidth: true,
  },
  {
    name: "allocationPurpose",
    label: "Strategic Allocation Purpose & Justification",
    type: "textarea",
    required: true,
    placeholder: "e.g. Structural steel bulk advance booking and foundation dewatering infrastructure.",
  },
];

interface BoardApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCapitalProcessed: () => void;
}

export function BoardApprovalDrawer({
  isOpen,
  onClose,
  onCapitalProcessed,
}: BoardApprovalDrawerProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const mapItem = (req: CapitalAllocationRequest): GenericApprovalItem<CapitalAllocationRequest> => ({
    id: req.id,
    title: req.projectName,
    subtitle: `Ref: ${req.requestReference}`,
    category: `Risk: ${req.riskRating}`,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName:
      req.riskRating.toLowerCase().includes("high") || req.riskRating.toLowerCase().includes("critical")
        ? "bg-destructive/10 text-destructive dark:text-red-400 border-destructive/30 font-medium"
        : req.riskRating.toLowerCase().includes("medium")
        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium"
        : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-medium",
    amountFormatted: `₹${req.requestedCapitalLakhs.toLocaleString("en-IN")} Lakhs`,
    justification: req.allocationPurpose,
    fields: [
      {
        label: "Strategic Purpose",
        value: req.allocationPurpose,
        colSpan: 2,
      },
    ],
  });

  return (
    <>
      <ModularApprovalDrawer<CapitalAllocationRequest>
        key={`board-drawer-${refreshTrigger}`}
        isOpen={isOpen}
        onClose={onClose}
        onRefresh={onCapitalProcessed}
        headerBadge="EXECUTIVE BOARD GOVERNANCE"
        headerSubtitleBadge="CAPITAL ALLOCATION"
        title="Board of Directors Capital Authorization Queue"
        description="Statutory board-level authorization required for all project capital deployments exceeding ₹2.5 Crore ($300k+)."
        icon={ShieldAlert}
        emptyTitle="Zero Pending Board Allocations"
        emptyDescription="All strategic capital deployment proposals have been underwritten and verified by the Board of Directors."
        authorizeLabel="Authorize Capital Deployment"
        rejectLabel="Reject Proposal"
        rejectModalTitle="Reject Capital Allocation Proposal"
        rejectReasonPlaceholder="e.g. Allocation exceeds quarterly leverage limits or lacks site clearance..."
        defaultRejectReason="Rejected by Board of Directors"
        headerActions={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Proposal</span>
          </Button>
        }
        loadItems={() => analyticsApi.getPendingApprovals()}
        mapItem={mapItem}
        onAuthorize={async (id) => {
          await analyticsApi.authorizeCapitalAllocation(id);
          onCapitalProcessed();
        }}
        onReject={async (id, reason) => {
          await analyticsApi.rejectCapitalAllocation(id, reason);
          onCapitalProcessed();
        }}
      />

      <RecordFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={() => {
          setRefreshTrigger((prev) => prev + 1);
          onCapitalProcessed();
        }}
        title="Submit Strategic Capital Allocation Request"
        endpoint="/api/v1/analytics/approvals"
        fields={CAPITAL_FIELDS}
        submitLabel="Submit to Board Queue"
        contextNote="Requests ≥ ₹2.5 Crore are automatically enqueued into the Board of Directors authorization queue."
        transform={(vals) => ({
          projectName: String(vals.projectName || ""),
          requestedCapitalLakhs: Number(vals.requestedCapitalLakhs || 0),
          riskRating: String(vals.riskRating || "Low"),
          allocationPurpose: String(vals.allocationPurpose || ""),
        })}
      />
    </>
  );
}
