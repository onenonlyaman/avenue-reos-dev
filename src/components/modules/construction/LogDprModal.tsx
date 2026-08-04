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
  const [projectId, setProjectId] = useState<string>(selectedProject || (projects[0]?.name || ""));
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [supervisingEngineer, setSupervisingEngineer] = useState<string>("Er. Rajesh Sharma");
  const [skilledLaborCount, setSkilledLaborCount] = useState<number | "">(42);
  const [unskilledLaborCount, setUnskilledLaborCount] = useState<number | "">(65);
  const [equipmentHours, setEquipmentHours] = useState<number | "">(14);
  const [cementBags, setCementBags] = useState<number | "">(450);
  const [steelMt, setSteelMt] = useState<number | "">(18.5);
  const [concreteM3, setConcreteM3] = useState<number | "">(120);
  const [workDetails, setWorkDetails] = useState<string>("Tower A 9th floor slab concrete pouring completed with high-frequency vibrators.");
  const [physicalProgressPct, setPhysicalProgressPct] = useState<number | "">(2.5);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const payload: CreateDprPayload = {
        projectId: projectId || selectedProject || projects[0]?.name || "Avenue Horizon - Gangapur Road",
        reportDate,
        supervisingEngineer,
        skilledLaborCount: typeof skilledLaborCount === "number" ? skilledLaborCount : 0,
        unskilledLaborCount: typeof unskilledLaborCount === "number" ? unskilledLaborCount : 0,
        equipmentHours: typeof equipmentHours === "number" ? equipmentHours : 0,
        cementBags: typeof cementBags === "number" ? cementBags : 0,
        steelMt: typeof steelMt === "number" ? steelMt : 0,
        concreteM3: typeof concreteM3 === "number" ? concreteM3 : 0,
        workDetails,
        physicalProgressPct: typeof physicalProgressPct === "number" ? physicalProgressPct : 0,
      };

      const newLog = await constructionApi.createDprLog(payload);
      onDprLogged(newLog);
      onClose();
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
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
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
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Skilled Labor</Label>
              <Input
                type="number"
                min="0"
                value={skilledLaborCount}
                onChange={(e) => setSkilledLaborCount(e.target.value ? parseInt(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Unskilled Labor</Label>
              <Input
                type="number"
                min="0"
                value={unskilledLaborCount}
                onChange={(e) => setUnskilledLaborCount(e.target.value ? parseInt(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Equipment Hours</Label>
              <Input
                type="number"
                min="0"
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
                value={cementBags}
                onChange={(e) => setCementBags(e.target.value ? parseInt(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Steel (Metric Tons)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
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
