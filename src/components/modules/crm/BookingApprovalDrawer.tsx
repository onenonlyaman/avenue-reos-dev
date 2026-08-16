"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { ModularApprovalDrawer, GenericApprovalItem } from "@/components/core/ModularApprovalDrawer";

export interface PendingHitlBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  projectName: string;
  unitNumber: string;
  basePriceLakhs: number;
  offeredPriceLakhs: number;
  discountPercentage: number;
  discountAmountLakhs: number;
  salesRepName: string;
  salesRepNotes: string;
  submittedDate: string;
  reason: "High Discount (>5%)" | "Cancellation Waiver Request" | "Custom Payment Schedule";
}

interface BookingApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingApproved?: (id: string) => void;
}

export function BookingApprovalDrawer({
  isOpen,
  onClose,
  onBookingApproved,
}: BookingApprovalDrawerProps) {
  const loadBookings = async (): Promise<PendingHitlBooking[]> => {
    const res = await fetch("/api/v1/sales/bookings/pending");
    const envelope = await res.json();
    if (!envelope.success || !Array.isArray(envelope.data)) {
      throw new Error(envelope.error?.message || "Failed to load pending bookings");
    }
    return envelope.data;
  };

  const mapItem = (b: PendingHitlBooking): GenericApprovalItem<PendingHitlBooking> => ({
    id: b.id,
    title: `Unit ${b.unitNumber} — ${b.customerName}`,
    subtitle: `Project: ${b.projectName} | Phone: ${b.customerPhone}`,
    category: b.reason,
    categoryBadgeVariant: "outline",
    categoryBadgeClassName: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium",
    amountFormatted: `₹${b.offeredPriceLakhs.toFixed(2)} Lakhs`,
    justification: b.salesRepNotes ? `Sales Rep (${b.salesRepName}): ${b.salesRepNotes}` : undefined,
    fields: [
      {
        label: "Base Price",
        value: `₹${b.basePriceLakhs.toFixed(2)} L`,
        isMono: true,
      },
      {
        label: "Requested Discount",
        value: `${b.discountPercentage.toFixed(1)}% (₹${b.discountAmountLakhs.toFixed(2)} L)`,
        isMono: true,
      },
      {
        label: "Sales Rep",
        value: b.salesRepName || "Sales Executive",
      },
      {
        label: "Submission Date",
        value: new Date(b.submittedDate).toLocaleDateString("en-IN"),
      },
    ],
  });

  return (
    <ModularApprovalDrawer<PendingHitlBooking>
      isOpen={isOpen}
      onClose={onClose}
      onRefresh={() => {
        if (onBookingApproved) onBookingApproved("");
      }}
      headerBadge="EXECUTIVE GOVERNANCE"
      headerSubtitleBadge="COMMERCIAL SALES HITL"
      title="Sales Director Quotation & Discount Authorization Queue"
      description="Executive sign-off required for unit bookings with commercial discounts exceeding 5% or bespoke payment plans."
      icon={ShieldAlert}
      emptyTitle="Zero Pending Commercial Approvals"
      emptyDescription="All sales quotations and booking proposals are within standard rate limits."
      authorizeLabel="Authorize Commercial Booking"
      rejectLabel="Reject Proposal"
      rejectModalTitle="Reject Commercial Quotation"
      rejectReasonPlaceholder="e.g. Discount exceeds maximum allowable margin for Tower A units..."
      defaultRejectReason="Commercial quotation rejected by Sales Director"
      loadItems={loadBookings}
      mapItem={mapItem}
      onAuthorize={async (id) => {
        const res = await fetch("/api/v1/sales/bookings/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: id }),
        });
        const envelope = await res.json();
        if (!envelope.success) throw new Error(envelope.error?.message || "Failed to authorize booking");
        if (onBookingApproved) onBookingApproved(id);
      }}
      onReject={async (id, reason) => {
        const res = await fetch("/api/v1/sales/bookings/reject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: id, rejectionNotes: reason }),
        });
        const envelope = await res.json();
        if (!envelope.success) throw new Error(envelope.error?.message || "Failed to reject booking");
        if (onBookingApproved) onBookingApproved(id);
      }}
    />
  );
}
