"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Scale, Sparkles, ShieldAlert, AlertCircle, Loader2, Eye, Calendar, Building, CheckCircle2 } from "lucide-react";
import { aiIntelligenceApi, DocumentLegalDraft } from "@/services/aiIntelligenceApi";

interface DocumentLegalAiViewProps {
  onOpenHitlDrawer: () => void;
}

export function DocumentLegalAiView({ onOpenHitlDrawer }: DocumentLegalAiViewProps) {
  const [docs, setDocs] = useState<DocumentLegalDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inspector sheet state
  const [selectedDoc, setSelectedDoc] = useState<DocumentLegalDraft | null>(null);

  // Dialog state for document generation
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<"MOM Report" | "Legal Deed" | "Sale Agreement" | "Possession Affidavit">("MOM Report");
  const [formTarget, setFormTarget] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await aiIntelligenceApi.getDocumentsLegal();
      setDocs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Document drafts could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = (type: "MOM Report" | "Legal Deed") => {
    setFormType(type);
    if (type === "MOM Report") {
      setFormTitle(`Executive MOM Report — ${new Date().toLocaleDateString("en-IN")}`);
      setFormTarget("Gangapur Road Site Executive Review");
      setFormSummary("Executive review of contractor milestones, procurement variance, and labor allocation.");
    } else {
      setFormTitle("Tripartite Joint Development Agreement Deed Draft");
      setFormTarget("Pathardi Phata Commercial Land Parcel");
      setFormSummary("Revenue share agreement drafted with standard legal covenants, possession clauses, and arbitration terms.");
    }
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleSaveDocument = async () => {
    if (!formTitle.trim()) {
      setFormError("Document title is required.");
      return;
    }
    if (!formTarget.trim()) {
      setFormError("Target project or buyer name is required.");
      return;
    }

    try {
      setIsGenerating(true);
      setFormError(null);
      const created = await aiIntelligenceApi.generateDocument({
        documentTitle: formTitle.trim(),
        documentType: formType,
        targetProjectOrBuyer: formTarget.trim(),
        summaryText: formSummary.trim() || "Structured corporate legal and business records draft.",
      });
      setDocs((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      if (created.requiresHitl) {
        onOpenHitlDrawer();
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Document draft could not be saved");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading AI document generation and legal deed drafting queue...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Document AI Service Unreachable"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Automated Business Minutes of Meeting (MOM) & Legal Deed Generator
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-driven document drafting with human-in-the-loop executive governance for real estate contracts and site reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={() => openCreateDialog("MOM Report")}
            disabled={isGenerating}
          >
            <FileText className="h-3.5 w-3.5" />
            Generate MOM Report
          </Button>

          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white"
            onClick={() => openCreateDialog("Legal Deed")}
            disabled={isGenerating}
          >
            <Scale className="h-3.5 w-3.5" />
            Draft Legal Deed
          </Button>
        </div>
      </div>

      {docs.length === 0 ? (
        <CorporateEmptyState
          title="No AI Document Drafts"
          description="No automated MOM reports or legal deeds have been generated yet. Click above to generate structured MOM reports or draft legal deeds."
          actionLabel="Generate MOM Report"
          onAction={() => openCreateDialog("MOM Report")}
          icon={FileText}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Document Title</TableHead>
                <TableHead className="text-xs font-semibold">Document Category</TableHead>
                <TableHead className="text-xs font-semibold">Target Project / Buyer</TableHead>
                <TableHead className="text-xs font-semibold">Generation Timestamp</TableHead>
                <TableHead className="text-xs font-semibold text-center">Verification Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    <div>{d.documentTitle}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate max-w-md">{d.summaryText}</div>
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <Badge variant="outline" className="text-[10px] font-medium border-border">
                      {d.documentType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {d.targetProjectOrBuyer}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {new Date(d.generationTimestamp).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    {d.verificationStatus === "VERIFIED" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                        VERIFIED
                      </Badge>
                    ) : d.verificationStatus === "PENDING_APPROVAL" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300 gap-1">
                        <ShieldAlert className="h-3 w-3 text-amber-700" />
                        PENDING HITL
                      </Badge>
                    ) : d.verificationStatus === "REJECTED" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                        REJECTED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold bg-muted text-muted-foreground border-border">
                        {d.verificationStatus}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => setSelectedDoc(d)}
                    >
                      <Eye className="h-3 w-3" />
                      Inspect Draft
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Creation Modal Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Generate Domain AI Document Draft
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure parameters to synthesize minutes of meeting or construct formal legal deed instruments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {formError && (
              <div className="p-2 bg-red-50 border border-red-200 text-red-900 rounded text-xs">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Document Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Joint Development Revenue Sharing Deed"
                className="w-full text-xs p-2 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Document Category</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full text-xs p-2 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="MOM Report">MOM Report (Site / Executive Review)</option>
                <option value="Legal Deed">Legal Deed (Joint Development / Title)</option>
                <option value="Sale Agreement">Sale Agreement (Unit Buyer Allotment)</option>
                <option value="Possession Affidavit">Possession Affidavit (Handover Clearance)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Target Project / Buyer / Site Location</label>
              <input
                type="text"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                placeholder="e.g. Pathardi Phata Commercial Hub"
                className="w-full text-xs p-2 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Summary & Scope Specifications</label>
              <textarea
                rows={3}
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                placeholder="Provide details on contractual terms, attendee allocations, or schedule agreements..."
                className="w-full text-xs p-2 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5"
              onClick={handleSaveDocument}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate & Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Inspector Sheet */}
      <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <SheetContent className="w-full sm:max-w-lg border-border bg-card p-6 overflow-y-auto">
          {selectedDoc && (
            <div className="space-y-5">
              <SheetHeader className="pb-4 border-b border-border space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {selectedDoc.documentType}
                  </Badge>
                  {selectedDoc.verificationStatus === "VERIFIED" ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                      VERIFIED
                    </Badge>
                  ) : selectedDoc.verificationStatus === "PENDING_APPROVAL" ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                      PENDING HITL APPROVAL
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                      {selectedDoc.verificationStatus}
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-base font-bold text-foreground">
                  {selectedDoc.documentTitle}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Generated on {new Date(selectedDoc.generationTimestamp).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "long",
                    timeStyle: "medium",
                  })}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 text-xs">
                <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-1.5">
                  <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-primary" />
                    Target Project / Allottee
                  </div>
                  <div className="font-semibold text-foreground text-xs pl-5">
                    {selectedDoc.targetProjectOrBuyer}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-foreground">Document Content & AI Extracted Terms</label>
                  <div className="p-3 bg-card border border-border rounded text-xs text-foreground font-mono leading-relaxed whitespace-pre-wrap">
                    {selectedDoc.summaryText}
                  </div>
                </div>

                {selectedDoc.verificationStatus === "PENDING_APPROVAL" && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-amber-700" />
                      Executive Governance Required
                    </div>
                    <p className="text-[11px] text-amber-800 leading-normal">
                      This legal instrument is currently awaiting executive verification in the Governance Director queue before binding issuance.
                    </p>
                    <Button
                      size="sm"
                      className="w-full text-xs font-semibold bg-amber-800 hover:bg-amber-900 text-white gap-1.5"
                      onClick={() => {
                        setSelectedDoc(null);
                        onOpenHitlDrawer();
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Open Governance Verification Queue
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
