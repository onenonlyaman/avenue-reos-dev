"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Clock, DollarSign, UserCheck, Target, ShieldCheck } from "lucide-react";
import { EmployeeDirectoryView } from "@/components/modules/hr/EmployeeDirectoryView";
import { AttendanceBiometricsView } from "@/components/modules/hr/AttendanceBiometricsView";
import { PayrollEngineView } from "@/components/modules/hr/PayrollEngineView";
import { RecruitmentAtsView } from "@/components/modules/hr/RecruitmentAtsView";
import { PerformanceTrainingView } from "@/components/modules/hr/PerformanceTrainingView";
import { HrApprovalDrawer } from "@/components/modules/hr/HrApprovalDrawer";
import { hrApi } from "@/services/hrApi";

export default function HrPage() {
  const [activeTab, setActiveTab] = useState<string>("directory");
  const [isHitlDrawerOpen, setIsHitlDrawerOpen] = useState<boolean>(false);
  const [pendingHitlCount, setPendingHitlCount] = useState<number>(0);

  const checkPendingHitl = async () => {
    try {
      const pending = await hrApi.getPendingApprovals();
      setPendingHitlCount(pending.length);
    } catch {
      setPendingHitlCount(0);
    }
  };

  useEffect(() => {
    checkPendingHitl();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="HR, People Operations & Payroll Engine Workspace"
        badgeText="PEOPLE OPERATIONS"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-semibold shrink-0 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
            onClick={() => setIsHitlDrawerOpen(true)}
          >
            <ShieldCheck className="h-4 w-4 text-amber-700" />
            <span>Governance Queue</span>
            {pendingHitlCount > 0 && (
              <span className="ml-1 bg-amber-700 text-white rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold">
                {pendingHitlCount}
              </span>
            )}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-lg h-10 w-full sm:w-auto flex overflow-x-auto justify-start">
          <TabsTrigger value="directory" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Users className="h-3.5 w-3.5" />
            Employee Directory
          </TabsTrigger>

          <TabsTrigger value="attendance" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Clock className="h-3.5 w-3.5" />
            Attendance & Biometrics
          </TabsTrigger>

          <TabsTrigger value="payroll" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <DollarSign className="h-3.5 w-3.5" />
            Payroll Engine
          </TabsTrigger>

          <TabsTrigger value="recruitment" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <UserCheck className="h-3.5 w-3.5" />
            Recruitment ATS
          </TabsTrigger>

          <TabsTrigger value="performance" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Target className="h-3.5 w-3.5" />
            Performance & Training
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="outline-none space-y-4">
          <EmployeeDirectoryView />
        </TabsContent>

        <TabsContent value="attendance" className="outline-none space-y-4">
          <AttendanceBiometricsView />
        </TabsContent>

        <TabsContent value="payroll" className="outline-none space-y-4">
          <PayrollEngineView onOpenHitlDrawer={() => setIsHitlDrawerOpen(true)} />
        </TabsContent>

        <TabsContent value="recruitment" className="outline-none space-y-4">
          <RecruitmentAtsView />
        </TabsContent>

        <TabsContent value="performance" className="outline-none space-y-4">
          <PerformanceTrainingView />
        </TabsContent>
      </Tabs>

      <HrApprovalDrawer
        isOpen={isHitlDrawerOpen}
        onClose={() => setIsHitlDrawerOpen(false)}
        onRefresh={checkPendingHitl}
      />
    </div>
  );
}

