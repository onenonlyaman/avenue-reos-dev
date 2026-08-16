"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HardHat, Calendar, FileText, ShieldCheck, ShieldAlert, Plus } from "lucide-react";
import { WbsMilestonesView } from "@/components/modules/construction/WbsMilestonesView";
import { DailyProgressView } from "@/components/modules/construction/DailyProgressView";
import { ContractorBillsView } from "@/components/modules/construction/ContractorBillsView";
import { QualitySafetyView } from "@/components/modules/construction/QualitySafetyView";
import { ConstructionApprovalDrawer } from "@/components/modules/construction/ConstructionApprovalDrawer";
import { CreateSiteModal } from "@/components/modules/construction/CreateSiteModal";
import { constructionApi } from "@/services/constructionApi";

export default function ConstructionPage() {
  const [activeTab, setActiveTab] = useState<string>("wbs");
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([
    { id: "all", name: "All Nashik Developments" },
  ]);
  const [selectedProject, setSelectedProject] = useState<string>("All Nashik Developments");
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [billsRefreshKey, setBillsRefreshKey] = useState<number>(0);
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState<boolean>(false);
  const [isCreateSiteModalOpen, setIsCreateSiteModalOpen] = useState<boolean>(false);

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/v1/projects").then((r) => r.json());
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const fetchedProjects = res.data.map((p: any) => ({
          id: p.id,
          name: p.location ? `${p.projectName} - ${p.location}` : p.projectName,
        }));
        setProjects([{ id: "all", name: "All Nashik Developments" }, ...fetchedProjects]);
      }
    } catch {
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const res = await constructionApi.getPendingApprovals();
      setPendingApprovalsCount(res.length);
    } catch {
      setPendingApprovalsCount(0);
    }
  };

  const handleBillProcessed = () => {
    loadPendingApprovals();
    setBillsRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    loadProjects();
    loadPendingApprovals();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="Construction & Site Management Workspace"
        badgeText="NASHIK OPERATIONS"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 font-medium"
              onClick={() => setIsCreateSiteModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Construction Site
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 font-medium"
              onClick={() => setIsApprovalDrawerOpen(true)}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
              Director Approval Queue
              <Badge variant="secondary" className="bg-amber-200 text-amber-950 text-[9px] px-1 py-0 ml-0.5 font-bold">
                {pendingApprovalsCount}
              </Badge>
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-lg h-10 w-full sm:w-auto flex overflow-x-auto justify-start">
          <TabsTrigger value="wbs" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <HardHat className="h-3.5 w-3.5" />
            Site Progress & WBS
          </TabsTrigger>

          <TabsTrigger value="dpr" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Calendar className="h-3.5 w-3.5" />
            Daily Progress Reports
          </TabsTrigger>

          <TabsTrigger value="ra-bills" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <FileText className="h-3.5 w-3.5" />
            Contractor RA Bills
          </TabsTrigger>

          <TabsTrigger value="inspections" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Quality & Safety Audits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wbs" className="outline-none space-y-4">
          <WbsMilestonesView
            projects={projects}
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
          />
        </TabsContent>

        <TabsContent value="dpr" className="outline-none space-y-4">
          <DailyProgressView
            projects={projects}
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
          />
        </TabsContent>

        <TabsContent value="ra-bills" className="outline-none space-y-4">
          <ContractorBillsView
            projects={projects}
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
            onOpenApprovalDrawer={() => setIsApprovalDrawerOpen(true)}
            refreshTrigger={billsRefreshKey}
          />
        </TabsContent>

        <TabsContent value="inspections" className="outline-none space-y-4">
          <QualitySafetyView
            projects={projects}
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
          />
        </TabsContent>
      </Tabs>

      <ConstructionApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onBillProcessed={handleBillProcessed}
      />

      <CreateSiteModal
        isOpen={isCreateSiteModalOpen}
        onClose={() => setIsCreateSiteModalOpen(false)}
        onSiteCreated={loadProjects}
      />
    </div>
  );
}


