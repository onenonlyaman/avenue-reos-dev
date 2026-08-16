"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Building2, AlertCircle, Loader2, Plus } from "lucide-react";
import { procurementApi, VendorPerformance } from "@/services/procurementApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";
import { Button } from "@/components/ui/button";

interface VendorDirectoryViewProps {
  refreshKey?: number;
  onRefreshNeeded?: () => void;
}

export function VendorDirectoryView({ refreshKey, onRefreshNeeded }: VendorDirectoryViewProps) {
  const [vendors, setVendors] = useState<VendorPerformance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await procurementApi.getVendors();
      setVendors(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Vendor directory could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const handleSaved = () => {
    loadData();
    if (onRefreshNeeded) onRefreshNeeded();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Approved Material Vendors & Performance Matrix
          </h3>
        </div>
        <Button size="sm" className="h-8 text-xs font-medium gap-1.5 shrink-0" onClick={() => setIsFormOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Register Vendor
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading vendor directory...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Vendor Directory Ledger Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : vendors.length === 0 ? (
        <CorporateEmptyState
          title="No Approved Vendors Found"
          description="No material vendors on record."
          actionLabel="Register Vendor"
          onAction={() => setIsFormOpen(true)}
          icon={Building2}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Vendor Business Name</TableHead>
                <TableHead className="text-xs font-semibold">Material Specialty</TableHead>
                <TableHead className="text-xs font-semibold">GSTIN Reference</TableHead>
                <TableHead className="text-xs font-semibold text-center">Performance Rating</TableHead>
                <TableHead className="text-xs font-semibold text-center">Active Orders</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => {
                let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                let statusText = "Active Supplier";

                if (v.status === "PENDING_REVIEW") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                  statusText = "Pending Compliance";
                } else if (v.status === "SUSPENDED") {
                  badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                  statusText = "Suspended";
                }

                return (
                  <TableRow key={v.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      {v.companyName}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {v.specialty}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                      {v.gstinReference || "Unregistered"}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-emerald-800 font-extrabold">{v.performanceRating}/100</span>
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, v.performanceRating))}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                      {v.activeOrderCount}
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
        onSaved={handleSaved}
        title="Register Vendor"
        endpoint="/api/v1/procurement/vendors"
        submitLabel="Register Vendor"
        fields={[
          { name: "companyName", label: "Vendor Name", type: "text", required: true },
          { name: "vendorCategory", label: "Material Category", type: "catalog", catalogCategory: "MATERIAL_CATEGORY", required: true, halfWidth: true },
          { name: "taxNumber", label: "GSTIN", type: "text", halfWidth: true },
          { name: "contactPerson", label: "Contact Person", type: "text", halfWidth: true },
          { name: "phone", label: "Contact Number", type: "text", halfWidth: true },
          { name: "email", label: "Email", type: "text", halfWidth: true },
          { name: "rating", label: "Performance Rating (0-5)", type: "number", halfWidth: true },
        ]}
      />
    </div>
  );
}
