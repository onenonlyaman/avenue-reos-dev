"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { procurementApi, PurchaseOrder } from "@/services/procurementApi";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

interface ProcurementApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderProcessed: () => void;
}

export function ProcurementApprovalDrawer({
  isOpen,
  onClose,
  onOrderProcessed,
}: ProcurementApprovalDrawerProps) {
  const mapItem = (po: PurchaseOrder): GenericApprovalItem<PurchaseOrder> => ({
    id: po.id,
    title: `PO #${po.orderReference} — ${po.vendorName}`,
    subtitle: `Site: ${po.siteName} | Material: ${po.materialDescription}`,
    category: po.status === "PENDING_APPROVAL" ? "DIRECTOR PO SIGN-OFF" : po.status,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    amountFormatted: `₹${po.orderValueLakhs.toLocaleString("en-IN")} Lakhs`,
    justification: po.rejectionReason || undefined,
    fields: [
      {
        label: "Quantity & Rate",
        value: `${po.quantity} units @ ₹${po.unitRate}/unit`,
        isMono: true,
      },
      {
        label: "Delivery Due",
        value: new Date(po.deliveryDueDate).toLocaleDateString("en-IN"),
      },
      {
        label: "GST & Freight",
        value: `₹${(po.gstAmount + po.freightAmount).toLocaleString("en-IN")}`,
        isMono: true,
      },
    ],
  });

  return (
    <ModularApprovalDrawer<PurchaseOrder>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={onOrderProcessed}
      headerBadge="PROCUREMENT DIRECTOR GOVERNANCE"
      headerSubtitleBadge="HIGH-VALUE PO SIGN-OFF"
      title="Director Purchase Order Authorization Queue"
      description="Review and authorize purchase orders exceeding ₹15 Lakhs or containing unit rates above master threshold limits."
      icon={ShieldAlert}
      emptyTitle="Zero Pending Purchase Approvals"
      emptyDescription="All supplier purchase orders and material requisitions have been verified."
      authorizeLabel="Authorize Purchase Order"
      rejectLabel="Reject PO"
      rejectModalTitle="Reject Supplier Purchase Order"
      rejectReasonPlaceholder="e.g. Rate variance exceeds standard benchmark or budget exceeded..."
      defaultRejectReason="Purchase order rejected by Procurement Director"
      loadItems={() => procurementApi.getPendingApprovals()}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        await procurementApi.authorizePurchaseOrder(id);
        onOrderProcessed();
      }}
      onReject={async (id, reason) => {
        await procurementApi.rejectPurchaseOrder(id, reason);
        onOrderProcessed();
      }}
    />
  );
}
