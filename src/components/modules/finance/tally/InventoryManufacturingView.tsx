"use client";

import React, { useState, useEffect } from "react";
import { tallyErpApi, GodownItem, StockItemDetail, BomRecipe } from "@/services/tallyErpApi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { toast } from "@/components/ui/sonner";
import { Boxes, Warehouse, Factory, Plus, Play, AlertTriangle } from "lucide-react";

export function InventoryManufacturingView() {
  const [godowns, setGodowns] = useState<GodownItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItemDetail[]>([]);
  const [bomRecipes, setBomRecipes] = useState<BomRecipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isCreateGodownOpen, setIsCreateGodownOpen] = useState<boolean>(false);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState<boolean>(false);
  const [isCreateBomOpen, setIsCreateBomOpen] = useState<boolean>(false);
  const [isExecuteBomOpen, setIsExecuteBomOpen] = useState<boolean>(false);
  const [selectedBom, setSelectedBom] = useState<BomRecipe | null>(null);
  const [productionQty, setProductionQty] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [godownName, setGodownName] = useState<string>("");
  const [godownLocation, setGodownLocation] = useState<string>("");

  const [itemName, setItemName] = useState<string>("");
  const [itemUom, setItemUom] = useState<string>("BAGS");
  const [itemHsn, setItemHsn] = useState<string>("6810");
  const [itemRate, setItemRate] = useState<string>("");
  const [itemStock, setItemStock] = useState<string>("");
  const [itemReorder, setItemReorder] = useState<string>("");
  const [itemValuation, setItemValuation] = useState<string>("WEIGHTED_AVG");

  const [bomName, setBomName] = useState<string>("");
  const [bomFinishedItemId, setBomFinishedItemId] = useState<string>("");
  const [bomYieldQty, setBomYieldQty] = useState<string>("1");

  const loadInventoryData = async () => {
    setIsLoading(true);
    try {
      const [gRes, bRes] = await Promise.all([
        tallyErpApi.fetchGodowns(),
        tallyErpApi.fetchBomRecipes(),
      ]);
      setGodowns(gRes.godowns || []);
      setStockItems(gRes.stockItems || []);
      setBomRecipes(bRes || []);
    } catch (err: any) {
      toast({ title: "Failed to load Inventory", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, []);

  const handleCreateGodown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!godownName.trim()) return;

    setIsSubmitting(true);
    try {
      await tallyErpApi.createGodown({ godownName, locationAddress: godownLocation });
      toast({ title: "Godown Created", description: `Location '${godownName}' registered.` });
      setIsCreateGodownOpen(false);
      setGodownName("");
      setGodownLocation("");
      loadInventoryData();
    } catch (err: any) {
      toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    setIsSubmitting(true);
    try {
      await tallyErpApi.createStockItem({
        itemName,
        uom: itemUom,
        hsnCode: itemHsn,
        gstRate: 18,
        standardRate: parseFloat(itemRate) || 0,
        currentStock: parseFloat(itemStock) || 0,
        reorderLevel: parseFloat(itemReorder) || 0,
        valuationMethod: itemValuation,
      });
      toast({ title: "Stock Item Created", description: `Item '${itemName}' registered.` });
      setIsCreateItemOpen(false);
      setItemName("");
      loadInventoryData();
    } catch (err: any) {
      toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomName.trim() || !bomFinishedItemId) {
      toast({ title: "Validation Error", description: "BOM name and finished item are required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const rawComps = stockItems
        .filter((it) => it.id !== bomFinishedItemId)
        .slice(0, 2)
        .map((it) => ({ componentItemId: it.id, quantity: 2, scrapRatePct: 2.5 }));

      await tallyErpApi.createBomRecipe({
        bomName,
        finishedItemId: bomFinishedItemId,
        yieldQuantity: parseFloat(bomYieldQty) || 1,
        components: rawComps,
      });

      toast({ title: "BOM Recipe Created", description: `Recipe '${bomName}' created.` });
      setIsCreateBomOpen(false);
      setBomName("");
      loadInventoryData();
    } catch (err: any) {
      toast({ title: "BOM Creation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteManufacturing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBom) return;

    setIsSubmitting(true);
    try {
      const res = await tallyErpApi.executeManufacturingJournal(selectedBom.id, parseFloat(productionQty) || 1);
      toast({ title: "Manufacturing Journal Executed", description: res.message });
      setIsExecuteBomOpen(false);
      loadInventoryData();
    } catch (err: any) {
      toast({ title: "Execution Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
        Loading Multi-Godown Stock & Manufacturing BOM Engine...
      </div>
    );
  }

  const totalValuation = stockItems.reduce((acc, it) => acc + it.totalValuation, 0);

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Stock Valuation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-foreground">
              ₹{totalValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Weighted Average / FIFO Real-Time Valuation</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Active Godowns / Warehouses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-primary">{godowns.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Multi-location storage nodes</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Catalogued Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-indigo-600">{stockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Raw materials & finished goods</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Manufacturing BOM Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-emerald-600">{bomRecipes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Standard assembly recipes</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Items Ledger Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Stock Ledger & Real-Time Inventory Valuation</CardTitle>
            <CardDescription>
              Inventory items with live balances, reorder points, and valuation methods (Weighted Average & FIFO).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsCreateGodownOpen(true)} className="gap-1 text-xs">
              <Warehouse className="h-3.5 w-3.5" /> Add Godown
            </Button>
            <Button size="sm" onClick={() => setIsCreateItemOpen(true)} className="gap-1 text-xs font-bold">
              <Plus className="h-3.5 w-3.5" /> Add Stock Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {stockItems.length === 0 ? (
            <div className="p-6">
              <CorporateEmptyState
                icon={Boxes}
                title="No Stock Items Catalogued"
                description="Register raw construction materials or finished goods to track inventory valuation."
                actionLabel="Add First Stock Item"
                onAction={() => setIsCreateItemOpen(true)}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>Valuation Method</TableHead>
                  <TableHead className="text-right">Unit Rate (₹)</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Total Valuation (₹)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono text-xs font-semibold">{it.itemCode}</TableCell>
                    <TableCell className="text-xs font-medium">{it.itemName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{it.hsnCode}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {it.valuationMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-right">
                      ₹{it.standardRate.toLocaleString("en-IN")} / {it.uom}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-right">
                      {it.currentStock.toLocaleString("en-IN")} {it.uom}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-primary text-right">
                      ₹{it.totalValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {it.isShortfall ? (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" /> Reorder Needed
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          Adequate
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bill of Materials (BOM) & Manufacturing Journal Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Bill of Materials (BOM) & Production Journals</CardTitle>
            <CardDescription>
              Execute manufacturing journals to automatically deduct component raw stock and credit finished goods.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsCreateBomOpen(true)} className="gap-1 text-xs">
            <Factory className="h-3.5 w-3.5" /> Define BOM Recipe
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {bomRecipes.length === 0 ? (
            <div className="p-6">
              <CorporateEmptyState
                icon={Factory}
                title="No BOM Recipes Defined"
                description="Define Bill of Materials recipes for concrete batching, pre-cast elements, or finished units."
                actionLabel="Create BOM Recipe"
                onAction={() => setIsCreateBomOpen(true)}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe Name</TableHead>
                  <TableHead>Finished Output Item</TableHead>
                  <TableHead>Standard Yield Qty</TableHead>
                  <TableHead>Components Count</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bomRecipes.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-xs font-semibold text-primary">{b.bomName}</TableCell>
                    <TableCell className="text-xs font-medium">{b.finishedProductName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.yieldQuantity} {b.uom}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{b.componentsCount} Raw Materials</TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedBom(b);
                          setIsExecuteBomOpen(true);
                        }}
                        className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Play className="h-3 w-3" /> Run Production Journal
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Godown Dialog */}
      <Dialog open={isCreateGodownOpen} onOpenChange={setIsCreateGodownOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Inventory Godown / Location</DialogTitle>
            <DialogDescription>Register a site yard, warehouse, or virtual storage godown.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGodown} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Godown Name</label>
              <Input
                value={godownName}
                onChange={(e) => setGodownName(e.target.value)}
                placeholder="e.g. Nashik Main Yard A"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Location Address / Site Node</label>
              <Input
                value={godownLocation}
                onChange={(e) => setGodownLocation(e.target.value)}
                placeholder="e.g. Sector 4 Plot Yard, Gangapur Road"
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
              {isSubmitting ? "Creating..." : "Save Godown Location"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Stock Item Dialog */}
      <Dialog open={isCreateItemOpen} onOpenChange={setIsCreateItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Stock Item</DialogTitle>
            <DialogDescription>Add inventory material or finished product to the stock ledger.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Item Name</label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. UltraTech OPC 53 Grade Cement"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Unit of Measure (UOM)</label>
                <select
                  value={itemUom}
                  onChange={(e) => setItemUom(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="BAGS">BAGS</option>
                  <option value="MT">METRIC TONS (MT)</option>
                  <option value="NOS">NUMBERS (NOS)</option>
                  <option value="SQFT">SQ. FEET</option>
                  <option value="CUM">CUBIC METERS (CUM)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">HSN Code</label>
                <Input
                  value={itemHsn}
                  onChange={(e) => setItemHsn(e.target.value)}
                  placeholder="6810"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Standard Unit Cost (₹)</label>
                <Input
                  type="number"
                  value={itemRate}
                  onChange={(e) => setItemRate(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Opening Stock Quantity</label>
                <Input
                  type="number"
                  value={itemStock}
                  onChange={(e) => setItemStock(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Reorder Threshold Level</label>
                <Input
                  type="number"
                  value={itemReorder}
                  onChange={(e) => setItemReorder(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Valuation Method</label>
                <select
                  value={itemValuation}
                  onChange={(e) => setItemValuation(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="WEIGHTED_AVG">Weighted Average Cost</option>
                  <option value="FIFO">FIFO (First In First Out)</option>
                  <option value="STANDARD_COST">Standard Cost</option>
                </select>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
              {isSubmitting ? "Creating..." : "Save Stock Item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Define BOM Recipe Dialog */}
      <Dialog open={isCreateBomOpen} onOpenChange={setIsCreateBomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Define Bill of Materials (BOM) Recipe</DialogTitle>
            <DialogDescription>Define finished product yield and mapped raw material ratios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBom} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">BOM Recipe Name</label>
              <Input
                value={bomName}
                onChange={(e) => setBomName(e.target.value)}
                placeholder="e.g. M25 Grade Concrete Batching"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Finished Output Item</label>
              <select
                value={bomFinishedItemId}
                onChange={(e) => setBomFinishedItemId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                required
              >
                <option value="">Select Finished Item</option>
                {stockItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.itemName} ({it.uom})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Standard Output Yield Quantity</label>
              <Input
                type="number"
                value={bomYieldQty}
                onChange={(e) => setBomYieldQty(e.target.value)}
                placeholder="1"
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
              Save BOM Definition
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Execute Manufacturing Dialog */}
      <Dialog open={isExecuteBomOpen} onOpenChange={setIsExecuteBomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute Manufacturing Production Journal</DialogTitle>
            <DialogDescription>
              Recipe: <span className="font-semibold text-primary">{selectedBom?.bomName}</span>. This will debit raw
              material stock and credit finished goods.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleExecuteManufacturing} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Target Production Output Quantity</label>
              <Input
                type="number"
                min="1"
                value={productionQty}
                onChange={(e) => setProductionQty(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white font-bold">
              {isSubmitting ? "Executing Journal..." : "Commit Manufacturing Journal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
