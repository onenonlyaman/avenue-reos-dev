"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Building2, Users, HardHat, FileText, AlertCircle, Loader2, Save } from "lucide-react";
import { settingsApi, TenantProfile } from "@/services/settingsApi";

export function TenantSettingsView() {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [legalName, setLegalName] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [fiscalYear, setFiscalYear] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsApi.getTenantProfile();
      setProfile(data);
      if (data) {
        setLegalName(data.organizationLegalName);
        setGstin(data.gstinRegistration);
        setAddress(data.registeredAddress);
        setTimezone(data.operationalTimezone);
        setCurrency(data.baseCurrency);
        setFiscalYear(data.fiscalYearCycle);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Organisation profile could not be loaded");
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
      const updated = await settingsApi.updateTenantProfile({
        organizationLegalName: legalName,
        gstinRegistration: gstin,
        registeredAddress: address,
        operationalTimezone: timezone,
        baseCurrency: currency,
        fiscalYearCycle: fiscalYear,
      });
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Organization settings could not be completed");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading organisation profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Organization Settings Error"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  if (!profile) {
    return (
      <CorporateEmptyState
        title="No Organization Profile Found"
        description="Organisation profile not yet configured."
        actionLabel="Initialize Enterprise Profile"
        onAction={handleSave}
        icon={Building2}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Multi-Tenant Organization & Financial Localization Profile
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Legal Corporate Entity"
          value={profile.organizationLegalName}
          subtext="Registered enterprise name"
          icon={Building2}
          trend="Multi-Tenant"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Provisioned System Users"
          value={`${profile.activeUsersCount} Active Accounts`}
          subtext="With RBAC role assignments"
          icon={Users}
          trend="User Directory"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Operational Site Accounts"
          value={`${profile.activeSiteAccountsCount} Nashik Sites`}
          subtext="Connected site offices"
          icon={HardHat}
          trend="Active Locations"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="GSTIN Tax Credentials"
          value={profile.gstinRegistration}
          subtext="State tax registration reference"
          icon={FileText}
          trend="GST Compliant"
          trendDirection="up"
        />
      </div>

      <Card className="border-border bg-card text-card-foreground">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-bold font-heading">
            Enterprise Profile & Statutory Regional Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-xs">
          {saveSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded text-xs font-semibold">
              Organization profile configuration updated successfully.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Organization Legal Name</Label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">GSTIN Tax Registration Reference</Label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Registered Corporate Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Operational Timezone</Label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Base Functional Currency</Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Fiscal Year Accounting Cycle</Label>
              <Input
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="h-8 text-xs font-mono"
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
            Save Profile Configuration
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
