"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnitDetail, UnitSpecSheet } from "./UnitSpecSheet";
import { ProjectInventoryModal } from "./ProjectInventoryModal";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Building, Layers, Info, Plus, Loader2 } from "lucide-react";

interface ProjectRecord {
  id: string;
  projectCode: string;
  projectName: string;
  location: string;
  towers: string[];
}

interface InteractiveUnitGridProps {
  onSelectUnitForQuotation: (unit: UnitDetail) => void;
}

export function InteractiveUnitGrid({ onSelectUnitForQuotation }: InteractiveUnitGridProps) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTower, setSelectedTower] = useState<string>("");
  const [units, setUnits] = useState<UnitDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeUnit, setActiveUnit] = useState<UnitDetail | null>(null);
  const [isSpecSheetOpen, setIsSpecSheetOpen] = useState<boolean>(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState<boolean>(false);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/projects");
      const envelope = await res.json();
      if (envelope.success && Array.isArray(envelope.data) && envelope.data.length > 0) {
        setProjects(envelope.data);
        setSelectedProjectId(envelope.data[0].id);
        if (envelope.data[0].towers && envelope.data[0].towers.length > 0) {
          setSelectedTower(envelope.data[0].towers[0]);
        } else {
          setSelectedTower("");
        }
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnits = async (projId: string, tower: string) => {
    try {
      setIsLoading(true);
      const query = new URLSearchParams();
      if (projId) query.append("projectId", projId);
      if (tower) query.append("towerName", tower);

      const res = await fetch(`/api/v1/units?${query.toString()}`);
      const envelope = await res.json();
      if (envelope.success && Array.isArray(envelope.data)) {
        setUnits(envelope.data);
      } else {
        setUnits([]);
      }
    } catch {
      setUnits([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadUnits(selectedProjectId, selectedTower);
    }
  }, [selectedProjectId, selectedTower]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const availableTowers = useMemo(() => {
    return selectedProject?.towers || [];
  }, [selectedProject]);

  const counts = useMemo(() => {
    return {
      Available: units.filter((u) => u.status === "Available").length,
      Reserved: units.filter((u) => u.status === "Reserved").length,
      Booked: units.filter((u) => u.status === "Booked").length,
      Blocked: units.filter((u) => u.status === "Blocked").length,
    };
  }, [units]);

  const floors = useMemo(() => {
    const floorMap: { [key: number]: UnitDetail[] } = {};
    units.forEach((u) => {
      if (!floorMap[u.floorNumber]) floorMap[u.floorNumber] = [];
      floorMap[u.floorNumber].push(u);
    });
    return Object.keys(floorMap)
      .map(Number)
      .sort((a, b) => b - a)
      .map((fNum) => ({
        floorNumber: fNum,
        units: floorMap[fNum].sort((a, b) => Number(a.unitNumber) - Number(b.unitNumber)),
      }));
  }, [units]);

  const handleUnitClick = (unit: UnitDetail) => {
    setActiveUnit(unit);
    setIsSpecSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card text-card-foreground p-4 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Building className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedProjectId} onValueChange={(val) => val && setSelectedProjectId(val)}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-72 truncate">
                <span>{selectedProject ? `${selectedProject.projectName} - ${selectedProject.location}` : "Select Target Project"}</span>
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.projectName} - {p.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedTower} onValueChange={(val) => val && setSelectedTower(val)}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-44 truncate">
                <span>{selectedTower || "All Towers"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Towers</SelectItem>
                {availableTowers.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-2 flex-wrap border-t md:border-t-0 pt-3 md:pt-0 border-border">
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-950 border border-emerald-300 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              <span>Available: {counts.Available}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-amber-50 text-amber-950 border border-amber-300 font-medium">
              <span className="h-2 w-2 rounded-full bg-amber-600"></span>
              <span>Reserved: {counts.Reserved}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-950 border border-blue-300 font-medium">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              <span>Booked: {counts.Booked}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-300 font-medium">
              <span className="h-2 w-2 rounded-full bg-slate-500"></span>
              <span>Blocked: {counts.Blocked}</span>
            </div>
          </div>

          <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => setIsInventoryModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Project / Matrix Blueprint
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading unit inventory...</span>
        </div>
      ) : units.length === 0 ? (
        <CorporateEmptyState
          title="No Architectural Unit Inventory Found"
          description="No units registered for the selected development."
          actionLabel="Replicate Floor Blueprint Matrix"
          onAction={() => setIsInventoryModalOpen(true)}
          icon={Building}
        />
      ) : (
        <div className="bg-card text-card-foreground p-5 rounded-lg border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="text-xs font-semibold text-foreground tracking-tight font-heading">
              Architectural Inventory Grid — {selectedTower || selectedProject?.projectName || "Building Tower Grid"}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Click any unit tile to inspect specifications and initiate quotation workflow.
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {floors.map((floor) => (
              <div key={floor.floorNumber} className="flex items-center gap-3">
                <div className="w-16 shrink-0 text-[11px] font-mono font-medium text-muted-foreground text-right pr-2">
                  Floor {floor.floorNumber}
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {floor.units.map((unit) => {
                    let colorClasses = "";
                    if (unit.status === "Available") {
                      colorClasses = "bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100 cursor-pointer";
                    } else if (unit.status === "Reserved") {
                      colorClasses = "bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100 cursor-pointer";
                    } else if (unit.status === "Booked") {
                      colorClasses = "bg-blue-50 border-blue-300 text-blue-950 cursor-pointer";
                    } else {
                      colorClasses = "bg-slate-100 border-slate-300 text-slate-700 cursor-pointer";
                    }

                    return (
                      <button
                        key={unit.unitNumber}
                        type="button"
                        onClick={() => handleUnitClick(unit)}
                        className={`p-2.5 rounded border transition-all text-left flex flex-col justify-between shadow-2xs ${colorClasses}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono font-bold text-xs">{unit.unitNumber}</span>
                          <span className="text-[9px] uppercase font-semibold px-1 rounded bg-black/5">
                            {unit.status.substring(0, 3)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between text-[10px]">
                          <span className="truncate max-w-[90px]">
                            {(unit.typology || unit.unitType).replace(" Executive Suite", "").replace(" Luxury Apartment", "")}
                          </span>
                          <span className="font-mono font-semibold">₹{unit.basePriceLakhs} L</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <UnitSpecSheet
        isOpen={isSpecSheetOpen}
        onClose={() => setIsSpecSheetOpen(false)}
        unit={activeUnit}
        onInitiateQuotation={(u) => {
          setIsSpecSheetOpen(false);
          onSelectUnitForQuotation(u);
        }}
      />

      <ProjectInventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        existingProjects={projects.map((p) => ({ id: p.id, projectName: p.projectName, location: p.location }))}
        onSuccess={() => {
          loadProjects();
          if (selectedProjectId) loadUnits(selectedProjectId, selectedTower);
        }}
      />
    </div>
  );
}
