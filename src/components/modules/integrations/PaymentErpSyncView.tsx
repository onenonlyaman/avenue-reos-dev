"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { CreditCard, Database, RefreshCw, Key, AlertCircle, Loader2 } from "lucide-react";
import { integrationsApi, ConnectorStatus } from "@/services/integrationsApi";
import { ConnectorConfigModal } from "./ConnectorConfigModal";

interface PaymentErpSyncViewProps {
  onOpenHitlDrawer: () => void;
}

export function PaymentErpSyncView({ onOpenHitlDrawer }: PaymentErpSyncViewProps) {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await integrationsApi.getConnectors();
      setConnectors(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connectors could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async (connectorName: string) => {
    try {
      setIsSyncing(true);
      const res = await integrationsApi.triggerManualSync(connectorName, 1550000);
      if (res.requiresHitl) {
        onOpenHitlDrawer();
      } else {
        await loadData();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Manual sync could not be completed");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Checking Tally Prime, SAP, and Razorpay gateway connection statuses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Integration Bridge Service Error"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  const activeCount = connectors.filter((c) => c.status === "CONNECTED").length;
  const totalVouchers = connectors.reduce((acc, c) => acc + c.syncedVouchers24h, 0);
  const totalWebhooks = connectors.reduce((acc, c) => acc + c.unreconciledWebhooks, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Payment Gateway & Enterprise ERP Synchronization Engine
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={() => setIsModalOpen(true)}
          >
            <Key className="h-3.5 w-3.5" />
            Configure Connector Credentials
          </Button>

          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={() => handleManualSync("Tally Prime Local Bridge")}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Force Manual Ledger Sync
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Active ERP Bridges"
          value={activeCount.toString()}
          subtext="Tally / SAP Connected"
          icon={Database}
          trend="Real-Time Voucher Push"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Razorpay Settlement Health"
          value="OPERATIONAL"
          subtext="Payment Ingestion"
          icon={CreditCard}
          trend="Webhook Listener Active"
          trendDirection="up"
        />

        <CorporateStatCard
          label="24h Synced Vouchers"
          value={totalVouchers.toString()}
          subtext="Double-Entry Mapped"
          icon={RefreshCw}
          trend="Automated Batch Sync"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Unreconciled Webhooks"
          value={totalWebhooks.toString()}
          subtext="Pending Demand Note Match"
          icon={AlertCircle}
          trend="Reconciliation Queue"
          trendDirection={totalWebhooks > 0 ? "down" : "up"}
        />
      </div>

      {connectors.length === 0 ? (
        <CorporateEmptyState
          title="No Active Payment or ERP Connectors"
          description="No payment or accounting connectors configured."
          actionLabel="Configure Connector Credentials"
          onAction={() => setIsModalOpen(true)}
          icon={Database}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {connectors.map((conn) => (
            <div key={conn.id} className="border border-border rounded-lg p-4 bg-card shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">{conn.connectorName}</h4>
                  <p className="text-[11px] text-muted-foreground">{conn.category}</p>
                </div>
                {conn.status === "CONNECTED" ? (
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
                  <span className="text-muted-foreground">Synced Vouchers (24h)</span>
                  <span className="font-bold text-foreground">{conn.syncedVouchers24h} Vouchers</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Unreconciled Webhooks</span>
                  <span className="font-bold text-foreground">{conn.unreconciledWebhooks} Payload(s)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Last Successful Sync</span>
                  <span className="font-bold text-foreground">
                    {new Date(conn.lastSyncTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => handleManualSync(conn.connectorName)}
                  disabled={isSyncing}
                >
                  Manual Sync
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConnectorConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(updated) => {
          setConnectors((prev) => {
            const idx = prev.findIndex((c) => c.id === updated.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = updated;
              return copy;
            }
            return [updated, ...prev];
          });
        }}
      />
    </div>
  );
}
