"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Landmark, Layers, Scale, Plus, AlertCircle, Loader2 } from "lucide-react";
import { legalApi, LandParcel } from "@/services/legalApi";
import { AcquireLandModal } from "./AcquireLandModal";

export function LandAcquisitionView() {
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await legalApi.getParcels();
      setParcels(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Land acquisition proposals could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalAcres = parcels.reduce((sum, p) => sum + p.plotAreaAcres, 0);
  const totalOutlayLakhs = parcels.reduce((sum, p) => sum + p.totalOutlayLakhs, 0);
  const totalConstructibleSqft = parcels.reduce((sum, p) => sum + p.constructibleSqft, 0);
  const activePipelineCount = parcels.filter((p) => p.acquisitionPhase !== "ACQUIRED" && p.acquisitionPhase !== "REJECTED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Land Reserve Bank & Acquisition Feasibility
          </h3>
        </div>

        <Button
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium shrink-0"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Record Land Acquisition Proposal
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Total Land Reserve"
          value={`${totalAcres.toFixed(1)} Acres`}
          subtext="Gross land bank footprint"
          icon={Landmark}
          trend="Land Bank"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Active Acquisitions"
          value={`${activePipelineCount} Parcels`}
          subtext="In feasibility & due diligence"
          icon={Layers}
          trend="In Due Diligence"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Committed Land Capital"
          value={`₹${(totalOutlayLakhs / 100).toFixed(2)} Cr`}
          subtext="Gross outlay including 7% stamp duty"
          icon={Scale}
          trend="Capital Outlay"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Constructible Yield"
          value={`${(totalConstructibleSqft / 100000).toFixed(2)} L Sq. Ft.`}
          subtext="NMC FSI potential build area"
          icon={Landmark}
          trend="FSI Yield"
          trendDirection="up"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading land bank proposals...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Land Bank Register Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : parcels.length === 0 ? (
        <CorporateEmptyState
          title="No Land Parcels Recorded"
          description="No land acquisition proposals on record."
          actionLabel="Record Land Acquisition Proposal"
          onAction={() => setIsModalOpen(true)}
          icon={Landmark}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Parcel Description</TableHead>
                <TableHead className="text-xs font-semibold">Location / Zone</TableHead>
                <TableHead className="text-xs font-semibold text-right">Plot Area (Acres)</TableHead>
                <TableHead className="text-xs font-semibold text-center">NMC FSI</TableHead>
                <TableHead className="text-xs font-semibold text-right">Estimated Outlay (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Title Clearance</TableHead>
                <TableHead className="text-xs font-semibold text-center">Acquisition Phase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcels.map((p) => {
                let titleStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                if (p.titleStatus === "Title Under Verification") {
                  titleStyle = "bg-amber-100 text-amber-800 border-amber-300";
                } else if (p.titleStatus === "Litigated / Encumbered") {
                  titleStyle = "bg-rose-100 text-rose-800 border-rose-300";
                }

                let phaseStyle = "bg-slate-100 text-slate-800 border-slate-300";
                if (p.acquisitionPhase === "ACQUIRED") {
                  phaseStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                } else if (p.acquisitionPhase === "FEASIBILITY") {
                  phaseStyle = "bg-amber-100 text-amber-800 border-amber-300";
                } else if (p.acquisitionPhase === "REJECTED") {
                  phaseStyle = "bg-rose-100 text-rose-800 border-rose-300";
                }

                return (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      <div>{p.parcelDescription}</div>
                      <span className="text-[10px] text-muted-foreground font-mono">Ref: {p.parcelReference}</span>
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {p.locationZone}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                      {p.plotAreaAcres} Acres
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                      {p.applicableFsi} FSI
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-primary text-sm">
                      ₹{p.totalOutlayLakhs.toFixed(2)} Lakhs
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-bold ${titleStyle}`}>
                        {p.titleStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-mono font-bold ${phaseStyle}`}>
                        {p.acquisitionPhase}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AcquireLandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onParcelCreated={loadData}
      />
    </div>
  );
}
