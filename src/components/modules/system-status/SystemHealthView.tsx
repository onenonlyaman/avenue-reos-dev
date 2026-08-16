"use client";

import React, { useState, useEffect } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Button } from "@/components/ui/button";
import { Database, Radio, ShieldCheck, AlertCircle, Loader2, Users, RefreshCw, Lock } from "lucide-react";
import { systemApi, SystemStatus, DbHealthReport } from "@/services/systemApi";

export function SystemHealthView() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealthReport | null>(null);
  const [dbHealthRestricted, setDbHealthRestricted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isManual = false) => {
    try {
      if (isManual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setDbHealthRestricted(false);

      const [sysRes, dbRes] = await Promise.allSettled([
        systemApi.getSystemStatus(),
        systemApi.getDbHealth(),
      ]);

      if (sysRes.status === "fulfilled") {
        setStatus(sysRes.value);
      } else {
        throw new Error(sysRes.reason?.message || "Platform diagnostics service unreachable");
      }

      if (dbRes.status === "fulfilled") {
        setDbHealth(dbRes.value);
      } else {
        setDbHealth(null);
        setDbHealthRestricted(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Platform diagnostics could not be loaded");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Running platform diagnostics and probing database registers...</span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <CorporateEmptyState
        title="System Diagnostic Service Error"
        description={error || "Unable to reach core platform health services."}
        actionLabel="Retry Diagnostics"
        onAction={() => loadData(false)}
        icon={AlertCircle}
      />
    );
  }

  const isolationHolds = dbHealth ? dbHealth.tenantIsolationEnforced : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">Platform Diagnostics & Health Telemetry</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Measured directly at request time across database connections, event queues, and tenant registers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2.5 py-1 rounded border border-border">
            Verified {new Date(status.lastVerifiedUtc).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Data Service"
          value={status.databaseStatus}
          subtext={`Query latency: ${status.databaseLatencyMs} ms`}
          icon={Database}
          trend={dbHealth ? `${dbHealth.totalTableCount} Registers` : undefined}
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
          subtext="Unexpired, unrevoked active sessions"
          icon={Users}
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Tenant Isolation"
          value={
            isolationHolds === null
              ? "ADMIN ONLY"
              : isolationHolds
              ? "ENFORCED"
              : "GAPS FOUND"
          }
          subtext={
            isolationHolds === null
              ? "Detailed schema audit requires director access"
              : isolationHolds
              ? "Every business register carries tenant scoping"
              : `${dbHealth?.registersWithoutTenantScope.length} register(s) without tenant scope`
          }
          icon={ShieldCheck}
          trendDirection={isolationHolds === true ? "up" : isolationHolds === false ? "down" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-foreground border-b border-border pb-2 flex items-center justify-between">
            <span>Data Service Schema & Pool Telemetry</span>
            {dbHealthRestricted && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-normal">
                <Lock className="h-3 w-3" /> Admin Protected
              </span>
            )}
          </h4>
          {dbHealth ? (
            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Registers Online</span>
                <span className="font-bold text-foreground">{dbHealth.totalTableCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Connection Pool Usage</span>
                <span className="font-bold text-foreground">
                  {dbHealth.connectionPoolActive} / {dbHealth.connectionPoolMax}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Schema Inspection Query Time</span>
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
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded border border-border/40">
              <p>Deep database schema and pool metrics require Governance Director authority.</p>
              <p className="text-[11px] mt-1 text-muted-foreground/80">Basic health ping and latency remain operational above.</p>
            </div>
          )}
        </div>

        <div className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-foreground border-b border-border pb-2 flex items-center justify-between">
            <span>Registers Without Tenant Scope</span>
            {dbHealthRestricted && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-normal">
                <Lock className="h-3 w-3" /> Admin Protected
              </span>
            )}
          </h4>
          {dbHealth ? (
            dbHealth.registersWithoutTenantScope.length === 0 ? (
              <p className="text-[11px] text-muted-foreground py-2">
                Every business register in this database carries a verified tenant column constraint.
              </p>
            ) : (
              <ul className="space-y-1 font-mono text-[11px]">
                {dbHealth.registersWithoutTenantScope.map((name) => (
                  <li key={name} className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-foreground">{name}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">NO TENANT COLUMN</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded border border-border/40">
              <p>Tenant isolation inspection requires Governance Director authority.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
