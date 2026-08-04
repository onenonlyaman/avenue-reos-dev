"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { CloudRain, Scale, FileText, AlertCircle, Loader2 } from "lucide-react";
import { integrationsApi, HardwareWorkspaceIntegration } from "@/services/integrationsApi";

export function HardwareWorkspaceView() {
  const [hardware, setHardware] = useState<HardwareWorkspaceIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await integrationsApi.getHardwareWorkspaceIntegrations();
      setHardware(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hardware integrations could not be loaded");
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
        <span>Loading connected site systems...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Site Systems Unreachable"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Connected Site Systems
          </h3>
        </div>
      </div>

      {hardware.length === 0 ? (
        <CorporateEmptyState
          title="No Hardware or Productivity APIs Connected"
          description="No site hardware or workspace systems connected."
          actionLabel="Refresh Integration List"
          onAction={loadData}
          icon={Scale}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hardware.map((item) => (
            <div key={item.id} className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    {item.category === "Weighbridge Automation Gate" ? (
                      <Scale className="h-4 w-4 text-amber-800 shrink-0" />
                    ) : item.category === "Site Weather Diagnostics API" ? (
                      <CloudRain className="h-4 w-4 text-blue-700 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                    )}
                    <h4 className="text-xs font-bold text-foreground">{item.integrationName}</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.category}</p>
                </div>

                {item.status === "CONNECTED" ? (
                  <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                    CONNECTED
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                    DISCONNECTED
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Synced Documents / Ingested Tickets</span>
                  <span className="font-bold text-foreground">{item.syncedDocumentsOrLogs} Items</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Last Successful Bridge Sync</span>
                  <span className="font-bold text-foreground">
                    {new Date(item.lastSyncTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end">
                <Button variant="outline" size="sm" className="h-7 text-[11px]">
                  View Activity
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
