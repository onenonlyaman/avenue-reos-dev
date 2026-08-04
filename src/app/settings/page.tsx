"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, Lock, ShieldAlert, ListChecks } from "lucide-react";
import { TenantSettingsView } from "@/components/modules/settings/TenantSettingsView";
import { UserManagementView } from "@/components/modules/settings/UserManagementView";
import { AuditLogsView } from "@/components/modules/settings/AuditLogsView";
import { SecurityPolicyView } from "@/components/modules/settings/SecurityPolicyView";
import { ReferenceListsView } from "@/components/modules/settings/ReferenceListsView";
import { AdminApprovalDrawer } from "@/components/modules/settings/AdminApprovalDrawer";
import { settingsApi } from "@/services/settingsApi";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>("tenant");
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState<boolean>(false);

  const loadPendingApprovals = async () => {
    try {
      const res = await settingsApi.getPendingApprovals();
      setPendingApprovalsCount(res.length);
    } catch {
      setPendingApprovalsCount(0);
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="System Administration, Multi-Tenant Settings & Security Audit Workspace"
        badgeText="SYSTEM ADMINISTRATION"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 font-medium"
            onClick={() => setIsApprovalDrawerOpen(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
            Governance Queue
            <Badge variant="secondary" className="bg-amber-200 text-amber-950 text-[9px] px-1 py-0 ml-0.5 font-bold">
              {pendingApprovalsCount}
            </Badge>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="w-full h-auto flex flex-wrap border-b border-border bg-transparent p-0 gap-1">
          <TabsTrigger
            value="tenant"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Building2 className="h-3.5 w-3.5" />
            Organization Profile
          </TabsTrigger>

          <TabsTrigger
            value="users"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Users className="h-3.5 w-3.5" />
            User & RBAC Management
          </TabsTrigger>

          <TabsTrigger
            value="audit"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <FileText className="h-3.5 w-3.5" />
            Audit Trail Logs
          </TabsTrigger>

          <TabsTrigger
            value="security"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Lock className="h-3.5 w-3.5" />
            Security Policies
          </TabsTrigger>
          <TabsTrigger
            value="reference"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Reference Lists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenant" className="outline-none space-y-4 pt-2">
          <TenantSettingsView />
        </TabsContent>

        <TabsContent value="users" className="outline-none space-y-4 pt-2">
          <UserManagementView />
        </TabsContent>

        <TabsContent value="audit" className="outline-none space-y-4 pt-2">
          <AuditLogsView />
        </TabsContent>

        <TabsContent value="security" className="outline-none space-y-4 pt-2">
          <SecurityPolicyView />
        </TabsContent>

        <TabsContent value="reference" className="outline-none space-y-4 pt-2">
          <ReferenceListsView />
        </TabsContent>
      </Tabs>

      <AdminApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onOverrideProcessed={loadPendingApprovals}
      />
    </div>
  );
}


