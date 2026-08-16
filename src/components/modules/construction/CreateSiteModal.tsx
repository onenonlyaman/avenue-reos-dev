"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2 } from "lucide-react";
import { constructionApi } from "@/services/constructionApi";

interface CreateSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSiteCreated: () => void;
}

export function CreateSiteModal({
  isOpen,
  onClose,
  onSiteCreated,
}: CreateSiteModalProps) {
  const [projectName, setProjectName] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [projectCode, setProjectCode] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("");
  const [gpsCoordinates, setGpsCoordinates] = useState<string>("");
  const [totalAreaSqft, setTotalAreaSqft] = useState<number | "">("");
  const [totalBudgetCr, setTotalBudgetCr] = useState<number | "">("");
  const [startDate, setStartDate] = useState<string>("");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!projectName.trim()) throw new Error("Project development name is required.");
      if (!location.trim()) throw new Error("Site location is required.");
      if (typeof totalAreaSqft !== "number") throw new Error("Total saleable area is required.");
      if (typeof totalBudgetCr !== "number") throw new Error("Sanctioned project budget is required.");
      if (!expectedCompletionDate) throw new Error("Target completion date is required.");

      // 1. Create the master project
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectCode: projectCode || undefined,
          projectName: projectName.trim(),
          location: location.trim(),
          totalAreaSqft,
          totalBudget: totalBudgetCr * 10000000,
          startDate: startDate || undefined,
          expectedCompletionDate,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "New project development could not be saved");

      const createdProject = json.data;

      // 2. Create the construction site entry linked to the project
      await constructionApi.createSite({
        projectId: createdProject.id,
        siteName: siteName.trim() || `${projectName.trim()} Site Alpha`,
        siteCode: projectCode ? `SITE-${projectCode.replace(/^PRJ-/, '')}` : undefined,
        gpsCoordinates: gpsCoordinates.trim() || `${location.trim()} (Nashik)`,
        status: "ACTIVE",
      });

      onSiteCreated();
      onClose();
      setProjectName("");
      setLocation("");
      setProjectCode("");
      setSiteName("");
      setGpsCoordinates("");
      setTotalAreaSqft("");
      setTotalBudgetCr("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Construction site could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-full p-6 bg-card text-card-foreground">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono">
              REAL ESTATE SITE PROVISIONING
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              MASTER RECORD & SITE REGISTRATION
            </span>
          </div>
          <DialogTitle className="text-base font-bold font-heading flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Add New Construction Site / Project
          </DialogTitle>
          <DialogDescription className="sr-only">
            Register a new development project site to enable WBS progress tracking, DPR logs, and contractor RA billing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Project Name</Label>
            <Input
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (!siteName) setSiteName(`${e.target.value} Main Site`);
              }}
              placeholder="e.g. Avenue Grandeur"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Site Office Name</Label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Grandeur Site Alpha"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Location / Area</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Gangapur Road, Nashik"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Project Code</Label>
              <Input
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="e.g. PRJ-GND-01"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">GPS Coordinates</Label>
              <Input
                value={gpsCoordinates}
                onChange={(e) => setGpsCoordinates(e.target.value)}
                placeholder="e.g. 19.9975° N, 73.7898° E"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Total Area (Sq.Ft.)</Label>
              <Input
                type="number"
                value={totalAreaSqft}
                onChange={(e) => setTotalAreaSqft(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Budget (₹ Cr)</Label>
              <Input
                type="number"
                step="0.5"
                value={totalBudgetCr}
                onChange={(e) => setTotalBudgetCr(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="e.g. 45.00"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Commencement Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
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
                Registering Site...
              </span>
            ) : (
              "Add Construction Site"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
