"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ShieldCheck, AlertCircle, Loader2 , Plus } from "lucide-react";
import { facilityApi, FacilityAsset } from "@/services/facilityApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";
import { Button } from "@/components/ui/button";

export function FacilityAssetsView() {
  const [assets, setAssets] = useState<FacilityAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await facilityApi.getAssets();
      setAssets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Facility assets could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Facility Infrastructure & Asset AMC Register
          </h3>
        </div>
      <Button size="sm" className="h-8 text-xs font-medium gap-1.5" onClick={() => setIsFormOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Register Asset
      </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading facility assets...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Facility Asset Register Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : assets.length === 0 ? (
        <CorporateEmptyState
          title="No Infrastructure Assets Found"
          description="No facility assets or maintenance contracts on record."
          actionLabel="Register Asset"
          onAction={() => setIsFormOpen(true)}
          icon={ShieldCheck}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Asset Description</TableHead>
                <TableHead className="text-xs font-semibold">Location / Site</TableHead>
                <TableHead className="text-xs font-semibold">Category</TableHead>
                <TableHead className="text-xs font-semibold">AMC Provider Name</TableHead>
                <TableHead className="text-xs font-semibold text-center">Warranty Expiry</TableHead>
                <TableHead className="text-xs font-semibold text-center">Last Service Date</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => {
                let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                let statusText = "Operational";

                if (a.operatingStatus === "NEEDS_SERVICE") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                  statusText = "Service Due";
                } else if (a.operatingStatus === "DOWN") {
                  badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                  statusText = "Out of Service";
                }

                return (
                  <TableRow key={a.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      {a.assetDescription}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {a.locationName}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {a.category}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {a.amcProviderName}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                      {a.warrantyExpiryDate}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                      {a.lastServiceDate}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-bold ${badgeStyle}`}>
                        {statusText}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <RecordFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={loadData}
        title="Register Facility Asset"
        endpoint="/api/v1/facility/assets"
        submitLabel="Register Asset"
        fields={[
          { name: "assetDescription", label: "Asset Description", type: "text", required: true },
          { name: "locationName", label: "Property / Site", type: "text", required: true, halfWidth: true },
          { name: "category", label: "Category", type: "catalog", catalogCategory: "ASSET_CATEGORY", required: true, halfWidth: true },
          { name: "amcProviderName", label: "Maintenance Contractor", type: "text", halfWidth: true },
          { name: "maintenanceCost", label: "Annual Contract Value (₹)", type: "number", halfWidth: true },
          { name: "warrantyExpiryDate", label: "Warranty Expiry", type: "date", halfWidth: true },
          { name: "lastServiceDate", label: "Last Service Date", type: "date", halfWidth: true },
        ]}
      />
    </div>
  );
}
