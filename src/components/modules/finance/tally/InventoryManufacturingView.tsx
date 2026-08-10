"use client";

import React, { useState, useEffect } from "react";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Warehouse, Boxes, Factory, ArrowRightLeft, Plus, CheckCircle2 } from "lucide-react";
import { tallyErpApi, GodownItem, BomRecipe } from "@/services/tallyErpApi";

export function InventoryManufacturingView() {
  const [godowns, setGodowns] = useState<GodownItem[]>([]);
  const [bomRecipes, setBomRecipes] = useState<BomRecipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [sourceGodownId, setSourceGodownId] = useState<string>("");
  const [targetGodownId, setTargetGodownId] = useState<string>("");
  const [transferItemName, setTransferItemName] = useState<string>("");
  const [transferQty, setTransferQty] = useState<string>("");

  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [productionQty, setProductionQty] = useState<string>("10");
  const [isSubmittingProd, setIsSubmittingProd] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gData, bData] = await Promise.all([
        tallyErpApi.fetchGodowns(),
        tallyErpApi.fetchBomRecipes(),
      ]);
      setGodowns(gData);
      setBomRecipes(bData);
      if (gData.length >= 2) {
        setSourceGodownId((prev) => prev || gData[0].id);
        setTargetGodownId((prev) => prev || gData[1].id);
      }
      if (bData.length > 0) {
        setSelectedRecipeId((prev) => prev || bData[0].id);
      }
    } catch {
      setGodowns([]);
      setBomRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStockTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItemName || !transferQty) return;

    try {
      await tallyErpApi.createStockJournal({
        sourceGodownId,
        targetGodownId,
        itemName: transferItemName,
        quantity: Number(transferQty),
        batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
        unitCost: 1500,
      });
      setTransferItemName("");
      setTransferQty("");
      await loadData();
    } catch {
    }
  };

  const handlePostProduction = async () => {
    if (!selectedRecipeId || !productionQty) return;
    setIsSubmittingProd(true);
    try {
      await tallyErpApi.postProductionVoucher({
        recipeId: selectedRecipeId,
        producedQuantity: Number(productionQty),
      });
      await loadData();
    } catch {
    } finally {
      setIsSubmittingProd(false);
    }
  };

  const totalBatches = godowns.reduce((sum, g) => sum + g.stockBatches.length, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Active Godown Hubs"
          value={String(godowns.length)}
          subtext="Warehouse Locations"
          icon={Warehouse}
          trend="Multi-Site"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Serialized Stock Batches"
          value={String(totalBatches)}
          subtext="FIFO/FEFO Valuation Active"
          icon={Boxes}
          trend="Audited"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Active BOM Recipes"
          value={String(bomRecipes.length)}
          subtext="Manufacturing Formulas"
          icon={Factory}
          trend="Overhead Calculated"
          trendDirection="neutral"
        />
        <CorporateStatCard
          label="Job Work Out Operations"
          value="0"
          subtext="Third-party Challans"
          icon={ArrowRightLeft}
          trend="Zero Outstanding"
          trendDirection="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold font-heading">
              Material Stock Transfer Journal (Godown Matrix)
            </CardTitle>
            <CardDescription className="text-xs">
              Transfer items across Main Warehouse, Sub-Godowns, Racks, and Bins
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleStockTransfer} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Source Warehouse / Godown</Label>
                  <Select value={sourceGodownId} onValueChange={(val) => val && setSourceGodownId(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Source Godown" />
                    </SelectTrigger>
                    <SelectContent>
                      {godowns.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.godownName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Target Warehouse / Godown</Label>
                  <Select value={targetGodownId} onValueChange={(val) => val && setTargetGodownId(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Target Godown" />
                    </SelectTrigger>
                    <SelectContent>
                      {godowns.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.godownName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Material Item Name</Label>
                  <Input
                    value={transferItemName}
                    onChange={(e) => setTransferItemName(e.target.value)}
                    placeholder="e.g. Fe-550 TMT Steel Bars (12mm)"
                    className="text-xs h-8"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Transfer Quantity</Label>
                  <Input
                    type="number"
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    placeholder="0.00"
                    className="text-xs h-8 font-mono"
                    required
                  />
                </div>
              </div>

              <Button type="submit" size="sm" className="w-full h-8 text-xs font-semibold mt-2">
                Post Material Transfer Note
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold font-heading">
              Post Production Voucher (BOM Manufacturing)
            </CardTitle>
            <CardDescription className="text-xs">
              Auto-deducts raw material components and registers finished goods inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Select Bill of Materials (BOM) Formula</Label>
              <Select value={selectedRecipeId} onValueChange={(val) => val && setSelectedRecipeId(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Recipe" />
                </SelectTrigger>
                <SelectContent>
                  {bomRecipes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.recipeName} ({r.finishedGoodsItemName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Target Production Output Units</Label>
              <Input
                type="number"
                value={productionQty}
                onChange={(e) => setProductionQty(e.target.value)}
                className="text-xs h-8 font-mono"
              />
            </div>

            <div className="p-3 bg-muted/40 border border-border rounded-md text-xs space-y-1">
              <div className="font-semibold text-foreground">Automatic Inventory Impact:</div>
              <div className="text-muted-foreground">Raw Component stock will be deducted proportionately.</div>
              <div className="text-muted-foreground">Overhead allocation & scrap calculation automatically applied.</div>
            </div>

            <Button
              onClick={handlePostProduction}
              disabled={isSubmittingProd || !selectedRecipeId}
              className="w-full h-8 text-xs font-semibold"
            >
              {isSubmittingProd ? "Executing BOM Journal..." : "Post Production Voucher"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold font-heading">
            Warehouse Godowns & Serialized Stock Batches
          </CardTitle>
          <CardDescription className="text-xs">
            Live stock balances and valuation breakdown across warehouses
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading stock levels...</div>
          ) : godowns.length === 0 ? (
            <CorporateEmptyState
              title="Zero Stock Records Found"
              description="No godowns or inventory stock batches have been created."
              icon={Warehouse}
            />
          ) : (
            <div className="space-y-4">
              {godowns.map((g) => (
                <div key={g.id} className="p-3 bg-card border border-border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground">{g.godownName}</span>
                      <span className="text-[11px] text-muted-foreground ml-2 font-mono">
                        ({g.rackLocation} • {g.binNumber})
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {g.parentGodownName}
                    </Badge>
                  </div>

                  {g.stockBatches.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground py-1">No stock batches in this godown.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-[11px] font-semibold py-1">Item Name</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1">Batch #</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 text-right">Quantity</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 text-right">Unit Cost</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 text-center">Valuation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.stockBatches.map((b) => (
                          <TableRow key={b.id} className="border-border">
                            <TableCell className="text-xs font-medium py-1">{b.itemName}</TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground py-1">{b.batchNumber}</TableCell>
                            <TableCell className="text-xs font-mono font-bold text-right py-1">{b.quantity}</TableCell>
                            <TableCell className="text-xs font-mono text-right py-1">₹{b.unitCost.toLocaleString("en-IN")}</TableCell>
                            <TableCell className="text-center py-1">
                              <Badge variant="outline" className="text-[9px]">
                                {b.valuationMethod}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
