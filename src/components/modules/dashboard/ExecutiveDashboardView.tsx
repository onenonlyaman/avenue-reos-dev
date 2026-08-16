"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { AuthorizationQueuePanel } from "@/components/modules/dashboard/AuthorizationQueuePanel";
import { BookingMomentumChart } from "@/components/modules/dashboard/BookingMomentumChart";
import { BudgetUtilisationPanel } from "@/components/modules/dashboard/BudgetUtilisationPanel";
import { ContractorClaimsPanel } from "@/components/modules/dashboard/ContractorClaimsPanel";
import { DashboardHeaderBanner } from "@/components/modules/dashboard/DashboardHeaderBanner";
import { DashboardKpiGrid } from "@/components/modules/dashboard/DashboardKpiGrid";
import { DashboardSecondaryStats } from "@/components/modules/dashboard/DashboardSecondaryStats";
import { DepartmentNavigationGrid } from "@/components/modules/dashboard/DepartmentNavigationGrid";
import { InventoryMixChart } from "@/components/modules/dashboard/InventoryMixChart";
import { ProjectPortfolioTable } from "@/components/modules/dashboard/ProjectPortfolioTable";
import { RecentRecordsFeed } from "@/components/modules/dashboard/RecentRecordsFeed";
import { SalesFunnelPanel } from "@/components/modules/dashboard/SalesFunnelPanel";
import { dashboardApi, DashboardSummary } from "@/services/dashboardApi";

export function ExecutiveDashboardView() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dashboardApi.getSummary({ signal });
      setSummary(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setSummary(null);
      setError(err instanceof Error ? err.message : "Operating console figures could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadSummary(controller.signal);
    return () => {
      controller.abort();
    };
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <DashboardHeaderBanner />
        <CorporateEmptyState
          title="Operating Figures Unavailable"
          description={error}
          actionLabel="Retry"
          onAction={() => loadSummary()}
          icon={AlertCircle}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeaderBanner />

      <DashboardKpiGrid summary={summary} isLoading={isLoading} />

      <DashboardSecondaryStats summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BookingMomentumChart data={summary?.bookingTrend ?? []} />
        </div>
        <InventoryMixChart
          data={summary?.inventoryMix ?? []}
          totalUnits={summary?.totalRegisteredUnits ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalesFunnelPanel stages={summary?.salesFunnel ?? []} />
        <AuthorizationQueuePanel
          queues={summary?.authorizationQueues ?? []}
          totalPending={summary?.pendingHitlApprovals ?? 0}
        />
        <ContractorClaimsPanel
          claims={summary?.contractorClaims ?? []}
          tickets={summary?.supportTickets ?? []}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ProjectPortfolioTable projects={summary?.projectPortfolio ?? []} />
        </div>
        <BudgetUtilisationPanel rows={summary?.budgetUtilisation ?? []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DepartmentNavigationGrid activeDepartmentsCount={summary?.activeDepartmentsCount ?? 0} />
        </div>
        <RecentRecordsFeed records={summary?.recentRecords ?? []} />
      </div>
    </div>
  );
}
