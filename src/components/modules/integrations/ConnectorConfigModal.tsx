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
import { Loader2 } from "lucide-react";
import { integrationsApi, ConnectorStatus } from "@/services/integrationsApi";

interface ConnectorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: ConnectorStatus) => void;
}

export function ConnectorConfigModal({ isOpen, onClose, onSuccess }: ConnectorConfigModalProps) {
  const [connectorName, setConnectorName] = useState("Razorpay Production Gateway");
  const [category, setCategory] = useState<any>("Payment Gateway");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectorName) {
      setError("Connector name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const updated = await integrationsApi.updateConnectorConfig({
        connectorName,
        category,
        status: "CONNECTED",
      });
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connector credentials could not be completed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Configure Connector Credentials
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Integration Provider</Label>
            <Select value={connectorName} onValueChange={(val) => val && setConnectorName(val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Razorpay Production Gateway">Razorpay Production Gateway</SelectItem>
                <SelectItem value="Tally Prime Local Bridge">Tally Prime Local Bridge</SelectItem>
                <SelectItem value="SAP Financial Sync">SAP Financial Sync</SelectItem>
                <SelectItem value="Oracle Enterprise ERP Bridge">Oracle Enterprise ERP Bridge</SelectItem>
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
              </SelectContent>
            </Select>
          </div>

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
