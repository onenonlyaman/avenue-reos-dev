"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ShieldCheck, AlertCircle, Loader2, Save, Lock } from "lucide-react";
import { settingsApi, SecurityPolicy } from "@/services/settingsApi";

export function SecurityPolicyView() {
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [mfaEnforced, setMfaEnforced] = useState<boolean>(true);
  const [ipRanges, setIpRanges] = useState<string>("192.168.1.0/24, 10.0.0.0/16");
  const [sessionTimeout, setSessionTimeout] = useState<number | "">(30);
  const [passwordRotation, setPasswordRotation] = useState<number | "">(90);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsApi.getSecurityPolicy();
      setPolicy(data);
      if (data) {
        setMfaEnforced(data.mfaEnforced);
        setIpRanges(data.whitelistedIpRanges.join(", "));
        setSessionTimeout(data.sessionTimeoutMinutes);
        setPasswordRotation(data.passwordRotationDays);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Security policy settings could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const ranges = ipRanges.split(",").map((s) => s.trim()).filter(Boolean);
      const updated = await settingsApi.updateSecurityPolicy({
        mfaEnforced,
        whitelistedIpRanges: ranges,
        sessionTimeoutMinutes: typeof sessionTimeout === "number" ? sessionTimeout : 30,
        passwordRotationDays: typeof passwordRotation === "number" ? passwordRotation : 90,
      });

      setPolicy(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Security policy settings could not be completed");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading security policy...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Security Policy Error"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  if (!policy) {
    return (
      <CorporateEmptyState
        title="No Security Policy Configured"
        description="No security policy configured."
        actionLabel="Initialize Default Security Policy"
        onAction={handleSave}
        icon={Lock}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Enterprise Security Policies & Authentication Safeguards
          </h3>
        </div>
      </div>

      <Card className="border-border bg-card text-card-foreground">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-bold font-heading flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Authentication & Access Control Policy Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-xs">
          {saveSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded text-xs font-semibold">
              Security policy parameters updated successfully.
            </div>
          )}

          <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20">
            <div>
              <span className="font-bold text-foreground block">Mandatory Multi-Factor Authentication (MFA)</span>
              <span className="text-[11px] text-muted-foreground">Enforce hardware token or authenticator app verification for all corporate user accounts.</span>
            </div>
            <Switch
              checked={mfaEnforced}
              onCheckedChange={setMfaEnforced}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Whitelisted Corporate & Site IP Ranges (CIDR notation)</Label>
            <Input
              value={ipRanges}
              onChange={(e) => setIpRanges(e.target.value)}
              placeholder="e.g. 192.168.1.0/24, 10.0.0.0/16"
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Automatic Inactivity Session Timeout (Minutes)</Label>
              <Input
                type="number"
                min="5"
                max="480"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value ? parseInt(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mandatory Password Rotation Frequency (Days)</Label>
              <Input
                type="number"
                min="30"
                max="365"
                value={passwordRotation}
                onChange={(e) => setPasswordRotation(e.target.value ? parseInt(e.target.value) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t border-border pt-3 justify-end">
          <Button
            size="sm"
            className="h-8 text-xs font-medium gap-1.5"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Security Policy
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
