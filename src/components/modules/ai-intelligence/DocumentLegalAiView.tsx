"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { FileText, Scale, Sparkles, ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import { aiIntelligenceApi, DocumentLegalDraft } from "@/services/aiIntelligenceApi";

interface DocumentLegalAiViewProps {
  onOpenHitlDrawer: () => void;
}

export function DocumentLegalAiView({ onOpenHitlDrawer }: DocumentLegalAiViewProps) {
  const [docs, setDocs] = useState<DocumentLegalDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleGenerateMom = async () => {
    try {
      setIsGenerating(true);
      const created = await aiIntelligenceApi.generateDocument({
        documentTitle: `MOM Report - ${new Date().toLocaleDateString("en-IN")}`,
        documentType: "MOM Report",
        targetProjectOrBuyer: "Gangapur Road Executive Meeting",
        summaryText: "Executive meeting transcript parsed into structured action items and owner allocations.",
      });
      setDocs((prev) => [created, ...prev]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "MOM report could not be saved");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDraftLegalDeed = async () => {
    try {
      setIsGenerating(true);
      const created = await aiIntelligenceApi.generateDocument({
        documentTitle: "JDA Revenue Share Legal Deed Draft",
        documentType: "Legal Deed",
        targetProjectOrBuyer: "Pathardi Phata Joint Development",
        summaryText: "Draft deed generated from recorded customer and land parcel data.",
      });
      setDocs((prev) => [created, ...prev]);
      if (created.requiresHitl) {
        onOpenHitlDrawer();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Legal deed could not be saved");
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
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={handleGenerateMom}
            disabled={isGenerating}
          >
            <FileText className="h-3.5 w-3.5" />
            Generate MOM Report
          </Button>

          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={handleDraftLegalDeed}
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
          onAction={handleGenerateMom}
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
                    <div className="text-[10px] text-muted-foreground font-mono">{d.summaryText}</div>
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
                    {new Date(d.generationTimestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
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
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold bg-muted text-muted-foreground border-border">
                        {d.verificationStatus}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <Button variant="outline" size="sm" className="h-7 text-[11px]">
                      Inspect Draft
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
