"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Layers, Plus, Loader2 } from "lucide-react";

interface ProjectUnitCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingProjects?: { id: string; projectName: string }[];
}

export function ProjectUnitCreationModal({
  isOpen,
  onClose,
  onSuccess,
  existingProjects = [],
}: ProjectUnitCreationModalProps) {
  const [activeTab, setActiveTab] = useState<"project" | "batchUnits">("project");
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
  const [unitsPerFloor, setUnitsPerFloor] = useState("");
  const [carpetAreaSqFt, setCarpetAreaSqFt] = useState("");
  const [baseRatePerSqFt, setBaseRatePerSqFt] = useState("");

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

  const handleBatchGenerateUnits = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          towerName,
          maxFloors: Number(maxFloors),
          unitsPerFloor: Number(unitsPerFloor),
          carpetAreaSqFt: Number(carpetAreaSqFt),
          baseRatePerSqFt: Number(baseRatePerSqFt),
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold font-heading flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            Project & Architectural Inventory Manager
          </DialogTitle>
          <DialogDescription className="sr-only">
            Register new developments or batch-generate tower unit inventory.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "project" | "batchUnits")} className="w-full">
          <TabsList className="grid grid-cols-2 w-full h-8 mb-3">
            <TabsTrigger value="project" className="text-xs">
              <Building className="h-3.5 w-3.5 mr-1.5" />
              New Project
            </TabsTrigger>
            <TabsTrigger value="batchUnits" className="text-xs">
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              Batch Unit Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="project" className="space-y-3 py-1 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Project Name</Label>
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
                <Label className="text-xs font-medium">Location</Label>
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
                <Label className="text-xs font-medium">Total Area (Sq.Ft.)</Label>
                <Input
                  type="number"
                  placeholder="250000"
                  value={totalAreaSqft}
                  onChange={(e) => setTotalAreaSqft(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Total Budget (₹ Cr)</Label>
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

            <DialogFooter className="pt-3 gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" className="text-xs h-8" onClick={handleCreateProject} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Register Project
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="batchUnits" className="space-y-3 py-1 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Target Development Project</Label>
              {existingProjects.length > 0 ? (
                <Select value={selectedProjectId} onValueChange={(val) => val && setSelectedProjectId(val)}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  disabled
                  value="Default Project (Will Auto-create if empty)"
                  className="h-8 text-xs bg-muted"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tower Name</Label>
                <Input
                  placeholder="Tower A - Gold"
                  value={towerName}
                  onChange={(e) => setTowerName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Max Floor Count</Label>
                <Input
                  type="number"
                  placeholder="14"
                  value={maxFloors}
                  onChange={(e) => setMaxFloors(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Units / Floor</Label>
                <Input
                  type="number"
                  placeholder="4"
                  value={unitsPerFloor}
                  onChange={(e) => setUnitsPerFloor(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Carpet (Sq.Ft.)</Label>
                <Input
                  type="number"
                  placeholder="1200"
                  value={carpetAreaSqFt}
                  onChange={(e) => setCarpetAreaSqFt(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Base Rate (₹/Sq.Ft.)</Label>
                <Input
                  type="number"
                  placeholder="5800"
                  value={baseRatePerSqFt}
                  onChange={(e) => setBaseRatePerSqFt(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="p-2.5 bg-muted/40 rounded border border-border text-[11px] text-muted-foreground font-mono">
              Generating {Number(maxFloors) * Number(unitsPerFloor)} units (Floors 1..{maxFloors}) for {towerName}.
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" className="text-xs h-8" onClick={handleBatchGenerateUnits} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Layers className="h-3.5 w-3.5 mr-1" />}
                Batch Generate Units
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
