"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { constructionApi, CreateDprPayload, DailyProgressLog } from "@/services/constructionApi";

interface LogDprModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  selectedProject: string;
  onDprLogged: (newLog: DailyProgressLog) => void;
}

export function LogDprModal({
  isOpen,
  onClose,
  projects,
  selectedProject,
  onDprLogged,
}: LogDprModalProps) {
  const activeProjects = projects.filter((p) => p.id !== "all");
  const initialProjectId = projects.find((p) => p.name === selectedProject && p.id !== "all")?.id || activeProjects[0]?.id || "";

  const [projectId, setProjectId] = useState<string>(initialProjectId);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [supervisingEngineer, setSupervisingEngineer] = useState<string>("");
  const [skilledLaborCount, setSkilledLaborCount] = useState<number | "">("");
  const [unskilledLaborCount, setUnskilledLaborCount] = useState<number | "">("");
  const [equipmentHours, setEquipmentHours] = useState<number | "">("");
  const [cementBags, setCementBags] = useState<number | "">("");
  const [steelMt, setSteelMt] = useState<number | "">( "");
  const [concreteM3, setConcreteM3] = useState<number | "">("");
  const [workDetails, setWorkDetails] = useState<string>("");
  const [physicalProgressPct, setPhysicalProgressPct] = useState<number | "">("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const match = projects.find((p) => p.name === selectedProject && p.id !== "all");
      setProjectId(match ? match.id : (activeProjects[0]?.id || ""));
      setError(null);
    }
  }, [isOpen, selectedProject, projects]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!projectId) throw new Error("Please select a construction development site.");
      if (!reportDate) throw new Error("Please select a shift report date.");
      if (!supervisingEngineer.trim()) throw new Error("Please enter the supervising site engineer name.");
      if (!workDetails.trim()) throw new Error("Please enter the shift work description.");

      const payload: CreateDprPayload = {
        projectId,
        reportDate,
        supervisingEngineer: supervisingEngineer.trim(),
        skilledLaborCount: typeof skilledLaborCount === "number" ? Math.max(0, skilledLaborCount) : 0,
        unskilledLaborCount: typeof unskilledLaborCount === "number" ? Math.max(0, unskilledLaborCount) : 0,
        equipmentHours: typeof equipmentHours === "number" ? Math.max(0, equipmentHours) : 0,
        cementBags: typeof cementBags === "number" ? Math.max(0, cementBags) : 0,
        steelMt: typeof steelMt === "number" ? Math.max(0, steelMt) : 0,
        concreteM3: typeof concreteM3 === "number" ? Math.max(0, concreteM3) : 0,
        workDetails: workDetails.trim(),
        physicalProgressPct: typeof physicalProgressPct === "number" ? Math.max(0, Math.min(100, physicalProgressPct)) : 0,
      };

      const newLog = await constructionApi.createDprLog(payload);
      onDprLogged(newLog);
      onClose();
      setSupervisingEngineer("");
      setWorkDetails("");
      setSkilledLaborCount("");
      setUnskilledLaborCount("");
      setEquipmentHours("");
      setCementBags("");
      setSteelMt("");
      setConcreteM3("");
      setPhysicalProgressPct("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Daily Progress Report could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl w-full p-6 bg-card text-card-foreground">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono">
              DAILY SITE SHIFT LOG
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              NASHIK CONSTRUCTION OPERATIONS
            </span>
          </div>
          <DialogTitle className="text-base font-bold font-heading">
            Log Daily Progress Report (DPR)
          </DialogTitle>
          <DialogDescription className="sr-only">
            Enter shift labor headcount, heavy equipment hours, raw material consumption, and physical progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Project Site</Label>
              <Select value={projectId} onValueChange={(val) => val && setProjectId(val)}>
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Shift Date</Label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Supervising Site Engineer</Label>
            <Input
              value={supervisingEngineer}
              onChange={(e) => setSupervisingEngineer(e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Skilled Labor</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={skilledLaborCount}
                onChange={(e) => setSkilledLaborCount(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Unskilled Labor</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={unskilledLaborCount}
                onChange={(e) => setUnskilledLaborCount(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Equipment Hours</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={equipmentHours}
                onChange={(e) => setEquipmentHours(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cement (Bags)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={cementBags}
                onChange={(e) => setCementBags(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Steel (Metric Tons)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="0.0"
                value={steelMt}
                onChange={(e) => setSteelMt(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Concrete (m³)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="0.0"
                value={concreteM3}
                onChange={(e) => setConcreteM3(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Shift Work Description</Label>
              <Textarea
                value={workDetails}
                onChange={(e) => setWorkDetails(e.target.value)}
                placeholder="Describe specific structural work, pour locations, testing completed..."
                className="min-h-[70px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Shift Progress (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="0.0"
                value={physicalProgressPct}
                onChange={(e) => setPhysicalProgressPct(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs font-medium" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Logging DPR...
              </span>
            ) : (
              "Submit DPR Log"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

