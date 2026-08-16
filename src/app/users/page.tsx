"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { UserDirectoryView } from "@/components/modules/users/UserDirectoryView";
import { UserApprovalDrawer } from "@/components/modules/users/UserApprovalDrawer";
import { usersApi } from "@/services/usersApi";

export default function UsersPage() {
  const [isHitlDrawerOpen, setIsHitlDrawerOpen] = useState<boolean>(false);
  const [pendingHitlCount, setPendingHitlCount] = useState<number>(0);
  const [refreshVersion, setRefreshVersion] = useState<number>(0);

  const checkPendingHitl = async () => {
    try {
      const pending = await usersApi.getPendingApprovals();
      setPendingHitlCount(pending.length);
    } catch {
      setPendingHitlCount(0);
    }
  };

  useEffect(() => {
    let isMounted = true;
    usersApi
      .getPendingApprovals()
      .then((pending) => {
        if (isMounted) setPendingHitlCount(pending.length);
      })
      .catch(() => {
        if (isMounted) setPendingHitlCount(0);
      });
    return () => {
      isMounted = false;
    };
  }, [refreshVersion]);

  const handleRefreshAll = () => {
    setRefreshVersion((prev) => prev + 1);
    checkPendingHitl();
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CorporatePageHeader
          title="Administrative User Directory & Identity Management Workspace"
          badgeText="RBAC DIRECTORY"
        />

        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs font-semibold shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20"
          onClick={() => setIsHitlDrawerOpen(true)}
        >
          <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Role Approvals</span>
          {pendingHitlCount > 0 && (
            <span className="ml-1 bg-amber-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold">
              {pendingHitlCount}
            </span>
          )}
        </Button>
      </div>

      <UserDirectoryView
        onOpenHitlDrawer={() => setIsHitlDrawerOpen(true)}
        refreshVersion={refreshVersion}
        onRefreshPendingCount={checkPendingHitl}
      />

      <UserApprovalDrawer
        isOpen={isHitlDrawerOpen}
        onClose={() => setIsHitlDrawerOpen(false)}
        onRefresh={handleRefreshAll}
      />
    </div>
  );
}

