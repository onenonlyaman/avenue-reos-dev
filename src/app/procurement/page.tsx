"use client";

import React, { useState, useEffect } from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, FileCheck2, Warehouse, Building2, ShieldAlert } from "lucide-react";
import { PurchaseOrdersView } from "@/components/modules/procurement/PurchaseOrdersView";
import { GoodsReceiptView } from "@/components/modules/procurement/GoodsReceiptView";
import { InventoryWarehouseView } from "@/components/modules/procurement/InventoryWarehouseView";
import { VendorDirectoryView } from "@/components/modules/procurement/VendorDirectoryView";
import { ProcurementApprovalDrawer } from "@/components/modules/procurement/ProcurementApprovalDrawer";
import { procurementApi } from "@/services/procurementApi";

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<string>("orders");
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const loadPendingApprovals = async () => {
    try {
      const res = await procurementApi.getPendingApprovals();
      setPendingApprovalsCount(res.length);
    } catch {
      setPendingApprovalsCount(0);
    }
  };

  const handleRefreshAll = () => {
    setRefreshKey((k) => k + 1);
    loadPendingApprovals();
  };

  useEffect(() => {
    loadPendingApprovals();
  }, [refreshKey]);

  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="Procurement & Warehouse Management Workspace"
        badgeText="SUPPLY CHAIN ERP"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 font-medium"
            onClick={() => setIsApprovalDrawerOpen(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
            Director Approval Queue
            <Badge variant="secondary" className="bg-amber-200 text-amber-950 text-[9px] px-1.5 py-0 ml-0.5 font-bold">
              {pendingApprovalsCount}
            </Badge>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-lg h-10 w-full sm:w-auto flex overflow-x-auto justify-start">
          <TabsTrigger value="orders" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <ShoppingCart className="h-3.5 w-3.5" />
            Requisitions & Orders
          </TabsTrigger>

          <TabsTrigger value="grn" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <FileCheck2 className="h-3.5 w-3.5" />
            Goods Receipt Notes
          </TabsTrigger>

          <TabsTrigger value="inventory" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Warehouse className="h-3.5 w-3.5" />
            Stock & Warehouses
          </TabsTrigger>

          <TabsTrigger value="vendors" className="text-xs h-8 gap-1.5 px-3 font-medium">
            <Building2 className="h-3.5 w-3.5" />
            Vendor Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="outline-none space-y-4">
          <PurchaseOrdersView refreshKey={refreshKey} onRefreshNeeded={handleRefreshAll} />
        </TabsContent>

        <TabsContent value="grn" className="outline-none space-y-4">
          <GoodsReceiptView refreshKey={refreshKey} onRefreshNeeded={handleRefreshAll} />
        </TabsContent>

        <TabsContent value="inventory" className="outline-none space-y-4">
          <InventoryWarehouseView refreshKey={refreshKey} onRefreshNeeded={handleRefreshAll} />
        </TabsContent>

        <TabsContent value="vendors" className="outline-none space-y-4">
          <VendorDirectoryView refreshKey={refreshKey} onRefreshNeeded={handleRefreshAll} />
        </TabsContent>
      </Tabs>

      <ProcurementApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onOrderProcessed={handleRefreshAll}
      />
    </div>
  );
}
