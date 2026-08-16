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

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function TenantSettingsView() {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [legalName, setLegalName] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("Asia/Kolkata (IST)");
  const [currency, setCurrency] = useState<string>("INR (₹)");
  const [fiscalYear, setFiscalYear] = useState<string>("April - March (India)");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsApi.getTenantProfile();
      setProfile(data);
      if (data) {
        setLegalName(data.organizationLegalName || "");
        setGstin(data.gstinRegistration || "");
        setAddress(data.registeredAddress || "");
        setTimezone(data.operationalTimezone || "Asia/Kolkata (IST)");
        setCurrency(data.baseCurrency || "INR (₹)");
        setFiscalYear(data.fiscalYearCycle || "April - March (India)");
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
      setError(null);
      setSaveSuccess(false);

      const trimmedName = legalName.trim();
      const trimmedGstin = gstin.trim().toUpperCase();
      const trimmedAddress = address.trim();

      if (!trimmedName) throw new Error("Organization legal name is required.");
      if (!trimmedGstin) throw new Error("GSTIN registration reference is required.");
      if (!GSTIN_REGEX.test(trimmedGstin)) {
        throw new Error("Invalid GSTIN format. Must be a 15-character statutory GST identification number (e.g. 27AAAAA0000A1Z5).");
      }
      if (!trimmedAddress) throw new Error("Registered corporate address is required.");

      const updated = await settingsApi.updateTenantProfile({
        organizationLegalName: trimmedName,
        gstinRegistration: trimmedGstin,
        registeredAddress: trimmedAddress,
        operationalTimezone: timezone.trim() || "Asia/Kolkata (IST)",
        baseCurrency: currency.trim() || "INR (₹)",
        fiscalYearCycle: fiscalYear.trim() || "April - March (India)",
      });

      setProfile(updated);
      setGstin(trimmedGstin);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
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
        <span>Loading organisation profile from database...</span>
      </div>
    );
  }

  if (error && !profile) {
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
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage statutory tax identifiers, functional currency, and operational timezone.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Legal Corporate Entity"
          value={profile.organizationLegalName || "Enterprise Entity"}
          subtext="Registered enterprise name"
          icon={Building2}
          trend="Corporate Entity"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Provisioned System Users"
          value={`${profile.activeUsersCount} Active Accounts`}
          subtext="With RBAC role assignments"
          icon={Users}
          trend="Live Accounts"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Operational Project Sites"
          value={`${profile.activeSiteAccountsCount} Active Locations`}
          subtext="Connected project offices"
          icon={HardHat}
          trend="Site Network"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="GSTIN Tax Credentials"
          value={profile.gstinRegistration || "Pending Registration"}
          subtext="State tax registration reference"
          icon={FileText}
          trend="Statutory Tax"
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
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded text-xs font-semibold">
              Organization profile configuration updated successfully in database.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Organization Legal Name</Label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Avenue Builders Pvt. Ltd."
                className="h-8 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">GSTIN Tax Registration Reference (15 Characters)</Label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 27AAAAA0000A1Z5"
                maxLength={15}
                className="h-8 text-xs font-mono font-bold uppercase"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Registered Corporate Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Gangapur Road, Nashik, Maharashtra 422013"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Operational Timezone</Label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Kolkata (IST)"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Base Functional Currency</Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="INR (₹)"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Fiscal Year Accounting Cycle</Label>
              <Input
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="April - March (India)"
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

