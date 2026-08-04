"use client";

import React, { useState } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Users, Layers, CheckCircle2, TrendingUp, FileText } from "lucide-react";
import { LeadManagementView, LeadRecord } from "@/components/modules/crm/LeadManagementView";
import { InteractiveUnitGrid } from "@/components/modules/crm/InteractiveUnitGrid";
import { QuotationBookingModal, BookingSubmissionData } from "@/components/modules/crm/QuotationBookingModal";
import { BookingApprovalDrawer } from "@/components/modules/crm/BookingApprovalDrawer";
import { CustomerTimelineDrawer } from "@/components/modules/crm/CustomerTimelineDrawer";
import { PipelineAnalyticsView } from "@/components/modules/crm/PipelineAnalyticsView";
import { UnitDetail } from "@/components/modules/crm/UnitSpecSheet";

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<string>("leads");

  const [selectedLeadForQuotation, setSelectedLeadForQuotation] = useState<LeadRecord | null>(null);
  const [selectedLeadForTimeline, setSelectedLeadForTimeline] = useState<LeadRecord | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState<boolean>(false);

  const [selectedUnitForQuotation, setSelectedUnitForQuotation] = useState<UnitDetail | null>(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState<boolean>(false);

  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState<boolean>(false);
  const [gridRefreshKey, setGridRefreshKey] = useState<number>(0);

  const [recentBookingNotification, setRecentBookingNotification] = useState<string | null>(null);

  const handleSelectLeadForQuotation = (lead: LeadRecord) => {
    setSelectedLeadForQuotation(lead);
    setActiveTab("units");
  };

  const handleViewTimeline = (lead: LeadRecord) => {
    setSelectedLeadForTimeline(lead);
    setIsTimelineOpen(true);
  };

  const handleSelectUnitForQuotation = (unit: UnitDetail) => {
    setSelectedUnitForQuotation(unit);
    setIsQuotationModalOpen(true);
  };

  const handleBookingSubmitted = (bookingData: BookingSubmissionData) => {
    setGridRefreshKey((prev) => prev + 1);
    if (bookingData.requiresHitl) {
      setRecentBookingNotification(
        `Booking proposal for Unit ${bookingData.unitNumber} requires executive HITL approval due to ${bookingData.discountPercentage}% discount.`
      );
    } else {
      setRecentBookingNotification(
        `Unit ${bookingData.unitNumber} booked successfully for ${bookingData.customerName}. Unit status updated to RESERVED / BOOKED.`
      );
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="CRM & Sales Management Workspace"
        badgeText="ENTERPRISE BOS"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
              onClick={() => setIsApprovalDrawerOpen(true)}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
              HITL Approval Queue
            </Button>
          </div>
        }
      />

      {recentBookingNotification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{recentBookingNotification}</span>
          </div>
          <button
            type="button"
            className="text-emerald-800 hover:text-emerald-950 font-bold ml-4 text-xs"
            onClick={() => setRecentBookingNotification(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-lg h-10 w-full sm:w-auto flex overflow-x-auto justify-start">
          <TabsTrigger value="leads" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Users className="h-3.5 w-3.5" />
            Leads & Inquiries
          </TabsTrigger>
          <TabsTrigger value="units" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Layers className="h-3.5 w-3.5" />
            Interactive Unit Grid
            {selectedLeadForQuotation && (
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            Bookings & Approvals
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            Pipeline Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="outline-none space-y-4">
          <LeadManagementView
            onSelectLeadForQuotation={handleSelectLeadForQuotation}
            onViewTimeline={handleViewTimeline}
          />
        </TabsContent>

        <TabsContent value="units" className="outline-none space-y-4">
          {selectedLeadForQuotation && (
            <div className="bg-muted/40 border border-border p-3 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>
                  Quotation Context Active for Prospect: <strong className="text-foreground">{selectedLeadForQuotation.name}</strong> ({selectedLeadForQuotation.interestedProject})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => setSelectedLeadForQuotation(null)}
              >
                Clear Selection
              </Button>
            </div>
          )}

          <InteractiveUnitGrid
            key={gridRefreshKey}
            onSelectUnitForQuotation={handleSelectUnitForQuotation}
          />
        </TabsContent>

        <TabsContent value="approvals" className="outline-none space-y-4">
          <div className="bg-card text-card-foreground p-5 rounded-lg border border-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-heading text-foreground">
                  Executive Approval Management Center
                </h3>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setIsApprovalDrawerOpen(true)}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Open Approval Queue
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="outline-none space-y-4">
          <PipelineAnalyticsView />
        </TabsContent>
      </Tabs>

      <QuotationBookingModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        selectedUnit={selectedUnitForQuotation}
        selectedLead={selectedLeadForQuotation}
        onBookingSubmitted={handleBookingSubmitted}
      />

      <BookingApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onBookingApproved={() => setGridRefreshKey((prev) => prev + 1)}
      />

      <CustomerTimelineDrawer
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        lead={selectedLeadForTimeline}
      />
    </div>
  );
}

