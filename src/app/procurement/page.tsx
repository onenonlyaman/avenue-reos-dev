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

  const loadPendingApprovals = async () => {
    try {
      const res = await procurementApi.getPendingApprovals();
      setPendingApprovalsCount(res.length);
    } catch {
      setPendingApprovalsCount(0);
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, []);

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
            <Badge variant="secondary" className="bg-amber-200 text-amber-950 text-[9px] px-1 py-0 ml-0.5 font-bold">
              {pendingApprovalsCount}
            </Badge>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="w-full h-auto flex flex-wrap border-b border-border bg-transparent p-0 gap-1">
          <TabsTrigger
            value="orders"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Requisitions & Orders
          </TabsTrigger>

          <TabsTrigger
            value="grn"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            Goods Receipt Notes
          </TabsTrigger>

          <TabsTrigger
            value="inventory"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Warehouse className="h-3.5 w-3.5" />
            Stock & Warehouses
          </TabsTrigger>

          <TabsTrigger
            value="vendors"
            className="text-xs h-9 gap-1.5 px-3 font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
          >
            <Building2 className="h-3.5 w-3.5" />
            Vendor Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="outline-none space-y-4 pt-2">
          <PurchaseOrdersView />
        </TabsContent>

        <TabsContent value="grn" className="outline-none space-y-4 pt-2">
          <GoodsReceiptView />
        </TabsContent>

        <TabsContent value="inventory" className="outline-none space-y-4 pt-2">
          <InventoryWarehouseView />
        </TabsContent>

        <TabsContent value="vendors" className="outline-none space-y-4 pt-2">
          <VendorDirectoryView />
        </TabsContent>
      </Tabs>

      <ProcurementApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onOrderProcessed={loadPendingApprovals}
      />
    </div>
  );
}

