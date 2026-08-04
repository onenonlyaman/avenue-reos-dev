"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { FileCheck2, Plus, AlertCircle, Loader2 } from "lucide-react";
import { procurementApi, GoodsReceiptNote, CreateGrnPayload } from "@/services/procurementApi";

export function GoodsReceiptView() {
  const [grnList, setGrnList] = useState<GoodsReceiptNote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [orderReference, setOrderReference] = useState<string>("PO-849201");
  const [warehouseName, setWarehouseName] = useState<string>("Avenue Horizon Site Warehouse");
  const [vendorName, setVendorName] = useState<string>("UltraTech Cement - Nashik Depot");
  const [materialName, setMaterialName] = useState<string>("OPC 53 Grade Cement Bags");
  const [acceptedQuantity, setAcceptedQuantity] = useState<number | "">(480);
  const [rejectedQuantity, setRejectedQuantity] = useState<number | "">(20);
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>("Bags");
  const [gatepassNumber, setGatepassNumber] = useState<string>("GP-MH15-8821");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await procurementApi.getGoodsReceiptNotes();
      setGrnList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Goods Receipt Notes could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGrn = async () => {
    try {
      setIsSubmitting(true);
      setModalError(null);

      if (!orderReference) throw new Error("Purchase order reference is required.");
      if (!warehouseName) throw new Error("Warehouse location is required.");
      if (!materialName) throw new Error("Material description is required.");

      const payload: CreateGrnPayload = {
        orderReference,
        warehouseName,
        vendorName,
        materialName,
        acceptedQuantity: typeof acceptedQuantity === "number" ? acceptedQuantity : 0,
        rejectedQuantity: typeof rejectedQuantity === "number" ? rejectedQuantity : 0,
        unitOfMeasure,
        gatepassNumber,
      };

      await procurementApi.createGoodsReceiptNote(payload);
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Goods Receipt Note could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Goods Receipt Notes (GRN) & Gatepass Log
          </h3>
        </div>

        <Button
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium shrink-0"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Log Goods Receipt
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading goods receipt notes...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="GRN Ledger Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : grnList.length === 0 ? (
        <CorporateEmptyState
          title="No Goods Receipt Notes Recorded"
          description="There are currently no gatepass material receipts logged in the system."
          actionLabel="Log Goods Receipt"
          onAction={() => setIsModalOpen(true)}
          icon={FileCheck2}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">GRN Reference</TableHead>
                <TableHead className="text-xs font-semibold">PO Reference</TableHead>
                <TableHead className="text-xs font-semibold">Delivered Site Warehouse</TableHead>
                <TableHead className="text-xs font-semibold">Vendor Entity</TableHead>
                <TableHead className="text-xs font-semibold">Material Name</TableHead>
                <TableHead className="text-xs font-semibold text-right">Accepted Qty</TableHead>
                <TableHead className="text-xs font-semibold text-right">Rejected Qty</TableHead>
                <TableHead className="text-xs font-semibold text-center">Gatepass Vehicle</TableHead>
                <TableHead className="text-xs font-semibold text-center">Inspection Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grnList.map((g) => {
                let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                let statusText = "Accepted";

                if (g.inspectionStatus === "PARTIALLY_ACCEPTED") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                  statusText = "Partial Accept";
                } else if (g.inspectionStatus === "REJECTED") {
                  badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                  statusText = "Quality Rejected";
                }

                return (
                  <TableRow key={g.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                      {g.grnReference}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                      {g.orderReference}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {g.warehouseName}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {g.vendorName}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {g.materialName}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-emerald-800">
                      {g.acceptedQuantity} {g.unitOfMeasure}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-rose-800">
                      {g.rejectedQuantity > 0 ? `${g.rejectedQuantity} ${g.unitOfMeasure}` : "0"}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                      {g.gatepassNumber}
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

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="sm:max-w-md w-full p-6 bg-card text-card-foreground">
          <DialogHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono">
                GOODS RECEIPT NOTE LOGGING
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                GATEPASS & QUALITY AUDIT
              </span>
            </div>
            <DialogTitle className="text-base font-bold font-heading">
              Log Goods Receipt Note (GRN)
            </DialogTitle>
            <DialogDescription className="sr-only">
              Record physical material delivery count and quality inspection results at site warehouse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {modalError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
                {modalError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Purchase Order Reference</Label>
                <Input
                  value={orderReference}
                  onChange={(e) => setOrderReference(e.target.value)}
                  placeholder="e.g. PO-849201"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Gatepass Vehicle Number</Label>
                <Input
                  value={gatepassNumber}
                  onChange={(e) => setGatepassNumber(e.target.value)}
                  placeholder="e.g. GP-MH15-8821"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Delivered Site Warehouse</Label>
              <Input
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                placeholder="e.g. Avenue Horizon Site Warehouse"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Vendor Entity</Label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. UltraTech Cement"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Material Name</Label>
                <Input
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="e.g. OPC 53 Grade Cement"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Accepted Qty</Label>
                <Input
                  type="number"
                  value={acceptedQuantity}
                  onChange={(e) => setAcceptedQuantity(e.target.value ? parseFloat(e.target.value) : "")}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Rejected Qty</Label>
                <Input
                  type="number"
                  value={rejectedQuantity}
                  onChange={(e) => setRejectedQuantity(e.target.value ? parseFloat(e.target.value) : "")}
                  className="h-8 text-xs font-mono font-bold text-rose-700"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Unit</Label>
                <Input
                  value={unitOfMeasure}
                  onChange={(e) => setUnitOfMeasure(e.target.value)}
                  placeholder="Bags / MT"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs font-medium" onClick={handleCreateGrn} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Recording GRN...
                </span>
              ) : (
                "Log Goods Receipt"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
