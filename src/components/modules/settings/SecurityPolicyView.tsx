"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { RecordFormModal, RecordField } from "@/components/core/RecordFormModal";
import { ShieldCheck, AlertCircle, Loader2, Save, Lock, KeyRound } from "lucide-react";
import { settingsApi, SecurityPolicy } from "@/services/settingsApi";

const CIDR_REGEX = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;

const OVERRIDE_FIELDS: RecordField[] = [
  {
    name: "targetUserOrPolicy",
    label: "Target User Email / Policy Area",
    type: "text",
    required: true,
    placeholder: "e.g. site.lead@avenue.internal or IP Perimeter",
  },
  {
    name: "modificationType",
    label: "Requested Security Modification",
    type: "select",
    required: true,
    options: [
      { value: "MFA Exemption", label: "MFA Exemption (Emergency / Site)" },
      { value: "Temporary IP Whitelist", label: "Temporary IP Whitelist Extension" },
      { value: "Session Extension", label: "Extended Session Duration (8h+)" },
      { value: "Admin Privilege Elevation", label: "Temporary Admin Privilege Elevation" },
    ],
  },
  {
    name: "justification",
    label: "Operational Justification & Business Need",
    type: "textarea",
    required: true,
    placeholder: "e.g. Site supervisor operating in remote offline area requiring temporary credential exemption.",
  },
];

export function SecurityPolicyView() {
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [mfaEnforced, setMfaEnforced] = useState<boolean>(true);
  const [ipRanges, setIpRanges] = useState<string>("");
  const [sessionTimeout, setSessionTimeout] = useState<number | "">(30);
  const [passwordRotation, setPasswordRotation] = useState<number | "">(90);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsApi.getSecurityPolicy();
      setPolicy(data);
      if (data) {
        setMfaEnforced(Boolean(data.mfaEnforced));
        setIpRanges(Array.isArray(data.whitelistedIpRanges) ? data.whitelistedIpRanges.join(", ") : "");
        setSessionTimeout(Number(data.sessionTimeoutMinutes) || 30);
        setPasswordRotation(Number(data.passwordRotationDays) || 90);
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
      setError(null);
      setSaveSuccess(false);

      // Parse and validate IP CIDR ranges
      const rawTokens = ipRanges.split(",").map((s) => s.trim()).filter(Boolean);
      for (const token of rawTokens) {
        if (!CIDR_REGEX.test(token)) {
          throw new Error(`"${token}" is not a valid IP or CIDR address format (e.g. 192.168.1.0/24 or 10.0.0.1).`);
        }
      }

      const timeoutNum = Number(sessionTimeout);
      if (isNaN(timeoutNum) || timeoutNum < 5 || timeoutNum > 480) {
        throw new Error("Session timeout must be between 5 and 480 minutes.");
      }

      const rotationNum = Number(passwordRotation);
      if (isNaN(rotationNum) || rotationNum < 15 || rotationNum > 365) {
        throw new Error("Password rotation frequency must be between 15 and 365 days.");
      }

      const updated = await settingsApi.updateSecurityPolicy({
        mfaEnforced,
        whitelistedIpRanges: rawTokens,
        sessionTimeoutMinutes: timeoutNum,
        passwordRotationDays: rotationNum,
      });

      setPolicy(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
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
        <span>Loading security policy from database...</span>
      </div>
    );
  }

  if (error && !policy) {
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
        description="No security policy configured for this organization."
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
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure identity authentication, IP perimeter access, and session timeouts.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs font-semibold self-start sm:self-auto"
          onClick={() => setIsOverrideModalOpen(true)}
        >
          <KeyRound className="h-3.5 w-3.5" />
          Request Security Override
        </Button>
      </div>

      <Card className="border-border bg-card text-card-foreground">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-bold font-heading flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Authentication & Access Control Policy Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded text-xs font-semibold">
              Security policy parameters updated successfully in database.
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
              aria-label="Enforce Multi-Factor Authentication"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Whitelisted Corporate & Site IP Ranges (CIDR notation, comma-separated)</Label>
            <Input
              value={ipRanges}
              onChange={(e) => setIpRanges(e.target.value)}
              placeholder="e.g. 192.168.1.0/24, 10.0.0.0/16, 203.0.113.50"
              className="h-8 text-xs font-mono"
            />
            <span className="text-[10px] text-muted-foreground block">
              Leave blank to allow authenticated access from any corporate network.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Automatic Inactivity Session Timeout (5 – 480 Minutes)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mandatory Password Rotation Frequency (15 – 365 Days)</Label>
              <Input
                type="number"
                min={15}
                max={365}
                value={passwordRotation}
                onChange={(e) => setPasswordRotation(e.target.value ? parseInt(e.target.value, 10) : "")}
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

      <RecordFormModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        onSaved={loadData}
        title="Request Security Policy Exemption / Override"
        endpoint="/api/v1/settings/approvals"
        fields={OVERRIDE_FIELDS}
        submitLabel="Submit Exemption Request"
        contextNote="Submits a formal security policy exception request into the administrative approval queue."
      />
    </div>
  );
}
