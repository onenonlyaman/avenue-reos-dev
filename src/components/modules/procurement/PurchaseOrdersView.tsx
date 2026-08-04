"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { ShoppingCart, Clock, CheckCircle2, Truck, Plus, AlertCircle, Loader2 } from "lucide-react";
import { procurementApi, PurchaseOrder } from "@/services/procurementApi";
import { CreatePoModal } from "./CreatePoModal";

export function PurchaseOrdersView() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await procurementApi.getPurchaseOrders();
      setOrders(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Purchase orders could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalPoValueLakhs = orders.reduce((sum, o) => sum + o.orderValueLakhs, 0);
  const pendingCount = orders.filter((o) => o.status === "PENDING_APPROVAL").length;
  const approvedCount = orders.filter((o) => o.status === "APPROVED" || o.status === "DISPATCHED").length;
  const totalCount = orders.length;
  const fulfillmentRate = totalCount > 0 ? Number(((approvedCount / totalCount) * 100).toFixed(0)) : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Material Requisitions & Purchase Orders
          </h3>
        </div>

        <Button
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium shrink-0"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Draft Purchase Order
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Total Active PO Value"
          value={`₹${(totalPoValueLakhs / 100).toFixed(2)} Cr`}
          subtext="Committed material expenditure"
          icon={ShoppingCart}
          trend="PO Encumbered"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Open Requisitions"
          value={`${pendingCount} Pending`}
          subtext="Orders awaiting director sign-off"
          icon={Clock}
          trend={pendingCount > 0 ? "Requires Action" : "Up to Date"}
          trendDirection={pendingCount > 0 ? "down" : "neutral"}
        />

        <CorporateStatCard
          label="Approved Purchase Orders"
          value={`${approvedCount} Issued`}
          subtext="Dispatched to material suppliers"
          icon={CheckCircle2}
          trend="Vendor Confirmed"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Vendor Fulfillment Rate"
          value={`${fulfillmentRate}%`}
          subtext="On-time material delivery compliance"
          icon={Truck}
          trend="SLA Compliant"
          trendDirection="up"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading purchase orders...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Purchase Orders Ledger Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : orders.length === 0 ? (
        <CorporateEmptyState
          title="No Purchase Orders Found"
          description="No requisitions or purchase orders on record."
          actionLabel="Draft Purchase Order"
          onAction={() => setIsCreateModalOpen(true)}
          icon={ShoppingCart}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Order Reference</TableHead>
                <TableHead className="text-xs font-semibold">Target Site Warehouse</TableHead>
                <TableHead className="text-xs font-semibold">Vendor Entity</TableHead>
                <TableHead className="text-xs font-semibold">Material Specification</TableHead>
                <TableHead className="text-xs font-semibold text-right">Order Value (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Delivery Due</TableHead>
                <TableHead className="text-xs font-semibold text-center">HITL Safeguard</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                let badgeStyle = "bg-slate-100 text-slate-800 border-slate-300";
                let statusText = "Pending";

                if (o.status === "APPROVED" || o.status === "DISPATCHED") {
                  badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                  statusText = o.status === "DISPATCHED" ? "Dispatched" : "Approved";
                } else if (o.status === "PENDING_APPROVAL") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                  statusText = "Pending Director Approval";
                } else if (o.status === "REJECTED") {
                  badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                  statusText = "Rejected";
                }

                return (
                  <TableRow key={o.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                      {o.orderReference}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {o.siteName}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {o.vendorName}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {o.materialDescription}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                      ₹{o.orderValueLakhs.toFixed(2)} Lakhs
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                      {o.deliveryDueDate}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      {o.requiresHitl ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-900 border-amber-300">
                          High Value (&gt; ₹15L)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                          Standard
                        </Badge>
                      )}
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

      <CreatePoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onOrderCreated={loadData}
      />
    </div>
  );
}
