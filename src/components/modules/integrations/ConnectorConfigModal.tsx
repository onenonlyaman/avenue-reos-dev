"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { integrationsApi, ConnectorStatus } from "@/services/integrationsApi";

interface ConnectorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: ConnectorStatus) => void;
  initialConnector?: ConnectorStatus | null;
}

export function ConnectorConfigModal({
  isOpen,
  onClose,
  onSuccess,
  initialConnector,
}: ConnectorConfigModalProps) {
  const [connectorName, setConnectorName] = useState(
    initialConnector?.connectorName || "Razorpay Production Gateway"
  );
  const [category, setCategory] = useState<
    "Payment Gateway" | "ERP Sync" | "Communications" | "Hardware API" | "Compliance"
  >(initialConnector?.category || "Payment Gateway");
  const [environment, setEnvironment] = useState<"Production" | "Sandbox">("Production");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (initialConnector) {
      setConnectorName(initialConnector.connectorName);
      setCategory(initialConnector.category);
    }
  }, [initialConnector]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectorName.trim()) {
      setError("Connector name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const updated = await integrationsApi.updateConnectorConfig({
        connectorName: connectorName.trim(),
        category,
        status: "CONNECTED",
        apiKey: apiKey.trim() || undefined,
        apiSecret: apiSecret.trim() || undefined,
        endpointUrl: endpointUrl.trim() || undefined,
        environment,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        onSuccess(updated);
        onClose();
        setSaveSuccess(false);
        setApiKey("");
        setApiSecret("");
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connector credentials could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Configure Connector Credentials & Bridge Parameters
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 rounded flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              Connector registered and verified successfully.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Integration Provider</Label>
              <Select value={connectorName} onValueChange={(val) => val && setConnectorName(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Razorpay Production Gateway">Razorpay Production Gateway</SelectItem>
                  <SelectItem value="Tally Prime Local Bridge">Tally Prime Local Bridge</SelectItem>
                  <SelectItem value="HDFC Escrow Statement Feed">HDFC Escrow Statement Feed</SelectItem>
                  <SelectItem value="SAP Financial Sync">SAP Financial Sync</SelectItem>
                  <SelectItem value="Oracle Enterprise ERP Bridge">Oracle Enterprise ERP Bridge</SelectItem>
                  <SelectItem value="MahaRERA Filing Portal">MahaRERA Filing Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Integration Category</Label>
              <Select value={category} onValueChange={(val) => val && setCategory(val as any)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Payment Gateway">Payment Gateway</SelectItem>
                  <SelectItem value="ERP Sync">ERP Sync</SelectItem>
                  <SelectItem value="Communications">Communications</SelectItem>
                  <SelectItem value="Hardware API">Hardware API</SelectItem>
                  <SelectItem value="Compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Endpoint / Service Bridge URL</Label>
            <Input
              type="text"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://api.gateway.reos.internal/v1/ledger-sync"
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">API Key / Client ID</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="rzp_live_••••••••••••••••"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">API Secret / Private Vault Key</Label>
              <Input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Environment Target</Label>
            <Select value={environment} onValueChange={(val) => val && setEnvironment(val as any)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Production">Production Environment</SelectItem>
                <SelectItem value="Sandbox">Sandbox / Staging Testing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Connector Credentials"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
