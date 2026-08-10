"use client";

import React, { useState, useEffect } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Database, Radio, ShieldCheck, AlertCircle, Loader2, Users } from "lucide-react";
import { systemApi, SystemStatus, DbHealthReport } from "@/services/systemApi";

/**
 * Every value on this screen is measured by the platform at request time.
 *
 * The previous version rendered fixed strings — "ENFORCED (Strict Isolation)",
 * "VERIFIED (100% Live DB)", "48 Static + 25 Dynamic", "LOCKED (Write-Once Read-Only)" —
 * that were not derived from anything, so the panel reported perfect health regardless of
 * the platform's actual state. Anything the platform cannot measure now shows as unknown
 * rather than green.
 */
export function SystemHealthView() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [sysRes, dbRes] = await Promise.all([
        systemApi.getSystemStatus(),
        systemApi.getDbHealth(),
      ]);
      setStatus(sysRes);
      setDbHealth(dbRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Platform diagnostics could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Running platform diagnostics...</span>
      </div>
    );
  }

  if (error || !status || !dbHealth) {
    return (
      <CorporateEmptyState
        title="System Diagnostic Service Error"
        description={error || "Unable to reach core platform health services."}
        actionLabel="Retry Diagnostics"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  const isolationHolds = dbHealth.tenantIsolationEnforced;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <h3 className="text-sm font-bold font-heading text-foreground">Platform Diagnostics</h3>
        <span className="text-[11px] font-mono text-muted-foreground">
          Verified {new Date(status.lastVerifiedUtc).toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Data Service"
          value={status.databaseStatus}
          subtext={`Query latency: ${status.databaseLatencyMs} ms`}
          icon={Database}
          trend={`${dbHealth.totalTableCount} Registers`}
          trendDirection={status.databaseStatus === "CONNECTED" ? "up" : "down"}
        />

        <CorporateStatCard
          label="Event Stream"
          value={status.eventStreamStatus}
          subtext={
            status.eventStreamFailuresLastHour === null
              ? "Failure count unavailable"
              : `${status.eventStreamFailuresLastHour} failure(s) in the last hour`
          }
          icon={Radio}
          trendDirection={status.eventStreamStatus === "OPERATIONAL" ? "up" : "neutral"}
        />

        <CorporateStatCard
          label="Active Sessions"
          value={status.activeSessionCount === null ? "UNKNOWN" : String(status.activeSessionCount)}
          subtext="Unexpired, unrevoked sessions"
          icon={Users}
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Tenant Isolation"
          value={isolationHolds ? "ENFORCED" : "GAPS FOUND"}
          subtext={
            isolationHolds
              ? "Every register carries a tenant column"
              : `${dbHealth.registersWithoutTenantScope.length} register(s) without tenant scope`
          }
          icon={ShieldCheck}
          trendDirection={isolationHolds ? "up" : "down"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-foreground border-b border-border pb-2">
            Data Service Health
          </h4>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Registers Online</span>
              <span className="font-bold text-foreground">{dbHealth.totalTableCount}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Connection Pool</span>
              <span className="font-bold text-foreground">
                {dbHealth.connectionPoolActive} / {dbHealth.connectionPoolMax}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Schema Query Time</span>
              <span className="font-bold text-foreground">{dbHealth.avgQueryResponseTimeMs} ms</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Migrations Applied</span>
              <span className="font-bold text-foreground">
                {dbHealth.appliedMigrationCount === 0
                  ? "None recorded"
                  : `${dbHealth.appliedMigrationCount} (latest ${dbHealth.appliedMigrations.at(-1)})`}
              </span>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-foreground border-b border-border pb-2">
            Registers Without Tenant Scope
          </h4>
          {dbHealth.registersWithoutTenantScope.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Every register in this database carries a tenant column.
            </p>
          ) : (
            <ul className="space-y-1 font-mono text-[11px]">
              {dbHealth.registersWithoutTenantScope.map((name) => (
                <li key={name} className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-foreground">{name}</span>
                  <span className="font-bold text-amber-800">NO TENANT COLUMN</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
