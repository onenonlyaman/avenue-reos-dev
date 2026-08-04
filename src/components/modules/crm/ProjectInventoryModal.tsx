"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building, Layers, Plus, Loader2, Grid, Sparkles } from "lucide-react";
import { useCatalogOptions } from "@/hooks/useCatalogOptions";

export interface BlueprintSlotRow {
  slot_number: number;
  typology: string;
  carpet_sqft: number;
  balcony_sqft: number;
  base_rate_sqft: number;
  facing_direction: string;
  parking_bays: string;
}

export interface ProjectOption {
  id: string;
  projectName: string;
  location: string;
}

interface ProjectInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingProjects?: ProjectOption[];
}

export function ProjectInventoryModal({
  isOpen,
  onClose,
  onSuccess,
  existingProjects = [],
}: ProjectInventoryModalProps) {
  const [activeTab, setActiveTab] = useState<"project" | "matrix">("project");
  const { values: facingDirections } = useCatalogOptions("FACING_DIRECTION");
  const { values: parkingTypes } = useCatalogOptions("PARKING_TYPE");
  const { values: unitTypologies } = useCatalogOptions("UNIT_TYPOLOGY");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [location, setLocation] = useState("");
  const [totalAreaSqft, setTotalAreaSqft] = useState("");
  const [totalBudgetCr, setTotalBudgetCr] = useState("");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState(existingProjects[0]?.id || "");
  const [towerName, setTowerName] = useState("");
  const [maxFloors, setMaxFloors] = useState("");
  const [unitsPerFloorCount, setUnitsPerFloorCount] = useState("1");
  const [floorRisePerFloor, setFloorRisePerFloor] = useState("");

  const [blueprintSlots, setBlueprintSlots] = useState<BlueprintSlotRow[]>([
    {
      slot_number: 1,
      typology: "",
      carpet_sqft: 0,
      balcony_sqft: 0,
      base_rate_sqft: 0,
      facing_direction: "",
      parking_bays: "",
    },
  ]);

  useEffect(() => {
    if (existingProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(existingProjects[0].id);
    }
  }, [existingProjects]);

  const handleSlotCountChange = (countStr: string) => {
    const num = Math.max(1, Math.min(12, Number(countStr) || 1));
    setUnitsPerFloorCount(num.toString());

    setBlueprintSlots((prev) => {
      const next: BlueprintSlotRow[] = [];
      for (let i = 1; i <= num; i++) {
        const existing = prev.find((s) => s.slot_number === i);
        if (existing) {
          next.push(existing);
        } else {
          next.push({
            slot_number: i,
            typology: "",
            carpet_sqft: 0,
            balcony_sqft: 0,
            base_rate_sqft: 0,
            facing_direction: "",
            parking_bays: "",
          });
        }
      }
      return next;
    });
  };

  const updateSlotField = (slotNum: number, field: keyof BlueprintSlotRow, val: unknown) => {
    setBlueprintSlots((prev) =>
      prev.map((s) => (s.slot_number === slotNum ? { ...s, [field]: val } : s))
    );
  };

  const selectedProjectLabel = useMemo(() => {
    const p = existingProjects.find((proj) => proj.id === selectedProjectId);
    return p ? `${p.projectName} - ${p.location}` : "Select Target Project";
  }, [existingProjects, selectedProjectId]);

  const summaryMetrics = useMemo(() => {
    const floors = Number(maxFloors) || 0;
    const rise = Number(floorRisePerFloor) || 0;
    const totalUnits = floors * blueprintSlots.length;
    let totalEstPrice = 0;

    for (let f = 1; f <= floors; f++) {
      const riseAmt = (f - 1) * rise;
      blueprintSlots.forEach((slot) => {
        totalEstPrice += slot.carpet_sqft * slot.base_rate_sqft + riseAmt;
      });
    }

    return {
      totalUnits,
      totalRevenueCr: Number((totalEstPrice / 10000000).toFixed(2)),
    };
  }, [maxFloors, floorRisePerFloor, blueprintSlots]);

  const handleCreateProject = async () => {
    if (!projectName.trim() || !location.trim() || !totalAreaSqft || !totalBudgetCr || !expectedCompletionDate) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          projectCode: projectCode || undefined,
          location,
          totalAreaSqft: Number(totalAreaSqft),
          totalBudget: Number(totalBudgetCr) * 10000000,
          expectedCompletionDate,
        }),
      });
      const envelope = await res.json();
      if (envelope.success) {
        setProjectName("");
        setProjectCode("");
        onSuccess();
        onClose();
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateMatrixUnits = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          towerName,
          maxFloors: Number(maxFloors),
          unitsPerFloor: blueprintSlots.length,
          floorRisePerFloor: Number(floorRisePerFloor),
          blueprint: blueprintSlots,
          isBatch: true,
        }),
      });
      const envelope = await res.json();
      if (envelope.success) {
        onSuccess();
        onClose();
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-base font-semibold font-heading flex items-center gap-2">
            <Grid className="h-4 w-4 text-primary" />
            Project Development & Architectural Inventory Manager
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure developments or generate the floor blueprint matrix for a tower.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "project" | "matrix")} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 w-full h-8 my-2">
            <TabsTrigger value="project" className="text-xs">
              <Building className="h-3.5 w-3.5 mr-1.5" />
              1. Add Development Project
            </TabsTrigger>
            <TabsTrigger value="matrix" className="text-xs">
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              2. Floor Blueprint Configurator Matrix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="project" className="space-y-3 py-2 text-xs overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Development Project Name</Label>
              <Input
                placeholder="e.g. Avenue Horizon - Gangapur Road"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Project Code</Label>
                <Input
                  placeholder="PRJ-GNK-01"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Regional Location</Label>
                <Input
                  placeholder="Gangapur Road, Nashik"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Total Land Parcel (Sq.Ft.)</Label>
                <Input
                  type="number"
                  placeholder="250000"
                  value={totalAreaSqft}
                  onChange={(e) => setTotalAreaSqft(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Authorized Project Budget (₹ Cr)</Label>
                <Input
                  type="number"
                  placeholder="85.00"
                  value={totalBudgetCr}
                  onChange={(e) => setTotalBudgetCr(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Target Completion Date</Label>
              <Input
                type="date"
                value={expectedCompletionDate}
                onChange={(e) => setExpectedCompletionDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-border">
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" className="text-xs h-8" onClick={handleCreateProject} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Register Project
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="matrix" className="space-y-4 py-1 text-xs flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-muted/30 p-3 rounded border border-border shrink-0">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium">Target Project</Label>
                <Select value={selectedProjectId} onValueChange={(val) => val && setSelectedProjectId(val)}>
                  <SelectTrigger className="h-8 text-xs w-full truncate">
                    <span>{selectedProjectLabel}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {existingProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.projectName} - {p.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Tower Designation</Label>
                <Input
                  placeholder="Tower A - Gold"
                  value={towerName}
                  onChange={(e) => setTowerName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Total Floors</Label>
                <Input
                  type="number"
                  placeholder="14"
                  value={maxFloors}
                  onChange={(e) => setMaxFloors(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Units / Floor Slots</Label>
                <Input
                  type="number"
                  placeholder="4"
                  value={unitsPerFloorCount}
                  onChange={(e) => handleSlotCountChange(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Floor Rise Increment / Floor (₹)</Label>
                <Input
                  type="number"
                  placeholder="4500"
                  value={floorRisePerFloor}
                  onChange={(e) => setFloorRisePerFloor(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-border rounded-lg">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="text-xs font-semibold w-16">Slot</TableHead>
                    <TableHead className="text-xs font-semibold w-44">Typology</TableHead>
                    <TableHead className="text-xs font-semibold w-24">Carpet (sqft)</TableHead>
                    <TableHead className="text-xs font-semibold w-24">Balcony (sqft)</TableHead>
                    <TableHead className="text-xs font-semibold w-28">Base Rate (₹/sqft)</TableHead>
                    <TableHead className="text-xs font-semibold w-36">Facing Direction</TableHead>
                    <TableHead className="text-xs font-semibold w-36">Parking Bays</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blueprintSlots.map((slot) => (
                    <TableRow key={slot.slot_number} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-xs">
                        x{slot.slot_number.toString().padStart(2, "0")}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={slot.typology}
                          onValueChange={(val) => val && updateSlotField(slot.slot_number, "typology", val)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Typology" />
                          </SelectTrigger>
                          <SelectContent>
                            {unitTypologies.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                            {unitTypologies.length === 0 && (
                              <div className="px-2 py-3 text-[11px] text-muted-foreground">No entries configured.</div>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={slot.carpet_sqft}
                          onChange={(e) => updateSlotField(slot.slot_number, "carpet_sqft", Number(e.target.value))}
                          className="h-7 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={slot.balcony_sqft}
                          onChange={(e) => updateSlotField(slot.slot_number, "balcony_sqft", Number(e.target.value))}
                          className="h-7 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={slot.base_rate_sqft}
                          onChange={(e) => updateSlotField(slot.slot_number, "base_rate_sqft", Number(e.target.value))}
                          className="h-7 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={slot.facing_direction}
                          onValueChange={(val) => val && updateSlotField(slot.slot_number, "facing_direction", val)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Facing" />
                          </SelectTrigger>
                          <SelectContent>
                            {facingDirections.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                            {facingDirections.length === 0 && (
                              <div className="px-2 py-3 text-[11px] text-muted-foreground">No entries configured.</div>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={slot.parking_bays}
                          onValueChange={(val) => val && updateSlotField(slot.slot_number, "parking_bays", val)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Parking" />
                          </SelectTrigger>
                          <SelectContent>
                            {parkingTypes.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                            {parkingTypes.length === 0 && (
                              <div className="px-2 py-3 text-[11px] text-muted-foreground">No entries configured.</div>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-3 bg-muted/40 rounded border border-border flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-foreground">
                  Matrix Replicator Summary: {summaryMetrics.totalUnits} Architectural Units (Floors 1..{maxFloors})
                </span>
              </div>
              <div className="font-mono text-emerald-800 font-bold text-sm">
                Est. Tower Realization: ₹{summaryMetrics.totalRevenueCr} Cr
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 shrink-0">
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" className="text-xs h-8" onClick={handleGenerateMatrixUnits} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Layers className="h-3.5 w-3.5 mr-1" />}
                Generate Floor Inventory
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

