"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Handshake, Plus, AlertCircle, Loader2 } from "lucide-react";
import { legalApi, JdaContract, DraftJdaPayload } from "@/services/legalApi";

export function JointVenturesView() {
  const [jdas, setJdas] = useState<JdaContract[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [landownerName, setLandownerName] = useState<string>("");
  const [projectSite, setProjectSite] = useState<string>("");
  const [developerSharePct, setDeveloperSharePct] = useState<number | "">(65);
  const [landownerSharePct, setLandownerSharePct] = useState<number | "">(35);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await legalApi.getJdas();
      setJdas(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "JDA contracts could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      setLandownerName("");
      setProjectSite("");
      setDeveloperSharePct(65);
      setLandownerSharePct(35);
      setModalError(null);
    }
  }, [isModalOpen]);

  const handleDraftJda = async () => {
    try {
      setIsSubmitting(true);
      setModalError(null);

      const owner = landownerName.trim();
      const site = projectSite.trim();

      if (!owner) throw new Error("Landowner entity or full name is required.");
      if (!site) throw new Error("Project development site is required.");

      const devShare = typeof developerSharePct === "number" ? developerSharePct : 65;
      const landShare = typeof landownerSharePct === "number" ? landownerSharePct : 35;

      if (devShare < 0 || devShare > 100 || landShare < 0 || landShare > 100) {
        throw new Error("Share percentages must be between 0% and 100%.");
      }

      if (Math.abs(devShare + landShare - 100) > 0.01) {
        throw new Error(`Developer share (${devShare}%) and Landowner share (${landShare}%) must equal exactly 100%.`);
      }

      const payload: DraftJdaPayload = {
        landownerName: owner,
        projectSite: site,
        developerSharePct: devShare,
        landownerSharePct: landShare,
      };

      await legalApi.draftJda(payload);
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Joint Development Agreement could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Joint Development Agreements (JDA) & Revenue Sharing
          </h3>
        </div>

        <Button
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium shrink-0"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Draft Joint Development Agreement
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading joint development agreements...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="JDA Portfolio Register Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : jdas.length === 0 ? (
        <CorporateEmptyState
          title="No Joint Development Agreements Found"
          description="No joint development agreements on record."
          actionLabel="Draft Joint Development Agreement"
          onAction={() => setIsModalOpen(true)}
          icon={Handshake}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Agreement Reference</TableHead>
                <TableHead className="text-xs font-semibold">Landowner Entity</TableHead>
                <TableHead className="text-xs font-semibold">Project Development Site</TableHead>
                <TableHead className="text-xs font-semibold text-center">Developer Allocation</TableHead>
                <TableHead className="text-xs font-semibold text-center">Landowner Allocation</TableHead>
                <TableHead className="text-xs font-semibold text-center">JDA Escrow Account</TableHead>
                <TableHead className="text-xs font-semibold text-center">Contract Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jdas.map((j) => (
                <TableRow key={j.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-mono font-bold text-foreground">
                    {j.agreementReference}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {j.landownerName}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {j.projectSite}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold text-emerald-800">
                    {j.developerSharePct}% Share
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold text-foreground">
                    {j.landownerSharePct}% Share
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                      {j.escrowAccountStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border-slate-300">
                      {j.contractStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="sm:max-w-md w-full p-6 bg-card text-card-foreground">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold font-heading">
              Draft Joint Development Agreement
            </DialogTitle>
            <DialogDescription className="sr-only">
              Define developer and landowner revenue/area allocation splits for project site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {modalError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Landowner Full Name / Entity</Label>
              <Input
                value={landownerName}
                onChange={(e) => setLandownerName(e.target.value)}
                placeholder="e.g. Kulkarni Family Trust"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Project Development Site</Label>
              <Input
                value={projectSite}
                onChange={(e) => setProjectSite(e.target.value)}
                placeholder="e.g. Avenue Horizon - Gangapur Road"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Developer Share (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={developerSharePct}
                  onChange={(e) => {
                    const raw = e.target.value ? parseFloat(e.target.value) : "";
                    if (typeof raw === "number") {
                      const clamped = Math.max(0, Math.min(100, raw));
                      setDeveloperSharePct(clamped);
                      setLandownerSharePct(100 - clamped);
                    } else {
                      setDeveloperSharePct("");
                    }
                  }}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Landowner Share (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={landownerSharePct}
                  onChange={(e) => {
                    const raw = e.target.value ? parseFloat(e.target.value) : "";
                    if (typeof raw === "number") {
                      const clamped = Math.max(0, Math.min(100, raw));
                      setLandownerSharePct(clamped);
                      setDeveloperSharePct(100 - clamped);
                    } else {
                      setLandownerSharePct("");
                    }
                  }}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs font-medium" onClick={handleDraftJda} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Drafting...
                </span>
              ) : (
                "Draft JDA Contract"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
