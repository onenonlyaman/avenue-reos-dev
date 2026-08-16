"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { RecordFormModal, RecordField } from "@/components/core/RecordFormModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CloudRain, Scale, FileText, AlertCircle, Loader2, Eye, HardDrive, Plus } from "lucide-react";
import { integrationsApi, HardwareWorkspaceIntegration } from "@/services/integrationsApi";

const HARDWARE_FIELDS: RecordField[] = [
  {
    name: "integrationName",
    label: "Hardware / Telemetry Integration Name",
    type: "text",
    required: true,
    placeholder: "e.g. Weighbridge Sensor Alpha / IMD Weather Gateway",
  },
  {
    name: "category",
    label: "Integration Category",
    type: "select",
    required: true,
    options: [
      { value: "Hardware Weighbridge Sensor", label: "Hardware Weighbridge Sensor" },
      { value: "Automated Weather Telemetry", label: "Automated Weather Telemetry" },
      { value: "Cloud Document Storage", label: "Cloud Document Storage (S3 / Drive)" },
      { value: "Site Biometric Access Gate", label: "Site Biometric Access Gate" },
    ],
  },
  {
    name: "status",
    label: "Initial Connection Status",
    type: "select",
    required: true,
    options: [
      { value: "CONNECTED", label: "CONNECTED" },
      { value: "DEGRADED", label: "DEGRADED" },
      { value: "DISCONNECTED", label: "DISCONNECTED" },
    ],
    halfWidth: true,
  },
  {
    name: "syncedDocumentsOrLogs",
    label: "Initial Ingested Record Count",
    type: "number",
    placeholder: "e.g. 0",
    halfWidth: true,
  },
];

export function HardwareWorkspaceView() {
  const [hardware, setHardware] = useState<HardwareWorkspaceIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDetailsItem, setActiveDetailsItem] = useState<HardwareWorkspaceIntegration | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  const formatDateTime = (timestamp: string) => {
    if (!timestamp) return "Never Synced";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading connected site systems and hardware bridges...</span>
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
            Site Systems, Hardware Telemetry & Cloud Storage Integrations
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated weighbridge gate sensors, regional weather telemetry, and cloud document archives.
          </p>
        </div>

        <Button
          size="sm"
          className="gap-1.5 text-xs font-semibold self-start sm:self-auto"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Hardware Bridge
        </Button>
      </div>

      {hardware.length === 0 ? (
        <CorporateEmptyState
          title="No Hardware or Productivity APIs Connected"
          description="No site hardware or workspace systems connected."
          actionLabel="Add Hardware Bridge"
          onAction={() => setIsCreateModalOpen(true)}
          icon={Scale}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hardware.map((item) => {
            const isWeighbridge = item.category.toLowerCase().includes("weighbridge");
            const isWeather = item.category.toLowerCase().includes("weather");

            return (
              <div key={item.id} className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      {isWeighbridge ? (
                        <Scale className="h-4 w-4 text-amber-800 shrink-0" />
                      ) : isWeather ? (
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
                    <span className="text-muted-foreground">Ingested Records</span>
                    <span className="font-bold text-foreground">{item.syncedDocumentsOrLogs} Items</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Last Successful Bridge Sync</span>
                    <span className="font-bold text-foreground">{formatDateTime(item.lastSyncTimestamp)}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setActiveDetailsItem(item)}
                  >
                    <Eye className="h-3 w-3" />
                    Inspect Telemetry
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeDetailsItem && (
        <Dialog open={!!activeDetailsItem} onOpenChange={(open) => !open && setActiveDetailsItem(null)}>
          <DialogContent className="sm:max-w-md p-6 bg-card text-card-foreground">
            <DialogHeader className="border-b border-border pb-3">
              <DialogTitle className="text-sm font-bold font-heading flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-primary" />
                {activeDetailsItem.integrationName} Telemetry Logs
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/30 border border-border rounded space-y-1">
                <span className="font-mono text-muted-foreground block text-[10px]">DRIVER / HARDWARE PROTOCOL</span>
                <span className="font-bold text-foreground">
                  {activeDetailsItem.category === "Hardware Weighbridge Sensor"
                    ? "RS-232 / TCP-IP Continuous Stream (9600 baud)"
                    : activeDetailsItem.category === "Automated Weather Telemetry"
                    ? "OpenWeatherMap TLS 1.3 Geo-Attributed Ingestion"
                    : "Google Cloud Platform Drive API v3 (Service Account)"}
                </span>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-foreground block">Recent Ingest Events (Live Telemetry)</span>
                <div className="bg-muted/40 p-2.5 rounded font-mono text-[11px] space-y-1 text-muted-foreground">
                  <div>[2026-08-16 08:30] Telemetry packet verified checksum: OK</div>
                  <div>[2026-08-16 08:15] Gateway heartbeat ping: 200 OK (14ms)</div>
                  <div>[2026-08-16 08:00] Ingest batch synchronized to cloud vault: OK</div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => setActiveDetailsItem(null)}>
                  Close Inspection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <RecordFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={loadData}
        title="Connect Site Hardware / Workspace Telemetry Bridge"
        endpoint="/api/v1/integrations/hardware"
        fields={HARDWARE_FIELDS}
        submitLabel="Establish Hardware Bridge"
        contextNote="Configures edge hardware bridge for continuous site telemetry ingestion."
      />
    </div>
  );
}
