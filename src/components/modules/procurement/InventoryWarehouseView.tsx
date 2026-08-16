"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Warehouse, AlertCircle, Loader2, Plus } from "lucide-react";
import { procurementApi, InventoryItem } from "@/services/procurementApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";
import { Button } from "@/components/ui/button";

interface InventoryWarehouseViewProps {
  refreshKey?: number;
  onRefreshNeeded?: () => void;
}

export function InventoryWarehouseView({ refreshKey, onRefreshNeeded }: InventoryWarehouseViewProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await procurementApi.getInventory();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Warehouse inventory could not be loaded");
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
            Warehouse Material Stock & Reorder Thresholds
          </h3>
        </div>
        <Button size="sm" className="h-8 text-xs font-medium gap-1.5 shrink-0" onClick={() => setIsFormOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Stock Item
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading stock balances...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Warehouse Inventory Ledger Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : items.length === 0 ? (
        <CorporateEmptyState
          title="No Warehouse Material Stock Records Found"
          description="No stock balances on record."
          actionLabel="Add Stock Item"
          onAction={() => setIsFormOpen(true)}
          icon={Warehouse}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Material Category</TableHead>
                <TableHead className="text-xs font-semibold">Item Description & Specification</TableHead>
                <TableHead className="text-xs font-semibold">Storage Depot Location</TableHead>
                <TableHead className="text-xs font-semibold text-right">Available Quantity</TableHead>
                <TableHead className="text-xs font-semibold text-right">Reorder Threshold</TableHead>
                <TableHead className="text-xs font-semibold text-right">Stock Valuation (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => {
                let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                let statusText = "Optimal";

                if (i.status === "Reorder Required") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                  statusText = "Reorder Required";
                } else if (i.status === "Out of Stock") {
                  badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                  statusText = "Out of Stock";
                }

                return (
                  <TableRow key={i.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      {i.category}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {i.itemDescription}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {i.storageLocation}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                      {i.availableQuantity.toLocaleString("en-IN")} {i.unitOfMeasure}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono text-muted-foreground">
                      {i.reorderLevel.toLocaleString("en-IN")} {i.unitOfMeasure}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                      ₹{i.stockValuationLakhs.toFixed(2)} Lakhs
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
        title="Register Stock Item"
        endpoint="/api/v1/procurement/inventory"
        submitLabel="Register Item"
        fields={[
          { name: "itemDescription", label: "Material Description", type: "text", required: true },
          { name: "category", label: "Category", type: "catalog", catalogCategory: "MATERIAL_CATEGORY", required: true, halfWidth: true },
          { name: "storageLocation", label: "Storage Location", type: "text", required: true, halfWidth: true },
          { name: "availableQuantity", label: "Available Quantity", type: "number", halfWidth: true },
          { name: "unitOfMeasure", label: "Unit of Measure", type: "text", halfWidth: true },
          { name: "reorderLevel", label: "Reorder Level", type: "number", halfWidth: true },
          { name: "unitCost", label: "Unit Cost (₹)", type: "number", halfWidth: true },
        ]}
      />
    </div>
  );
}
