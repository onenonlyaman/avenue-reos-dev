"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchResultItem } from "@/services/searchApi";
import { ExternalLink, ShieldAlert, Sparkles, Database, FileText, Copy, Check } from "lucide-react";
import Link from "next/link";

interface SearchDetailDrawerProps {
  item: SearchResultItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: () => void;
}

function formatKeyLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    if (key.toLowerCase().includes("amount") || key.toLowerCase().includes("price") || key.toLowerCase().includes("cost")) {
      return `₹${val.toLocaleString("en-IN")}`;
    }
    return val.toLocaleString("en-IN");
  }
  if (typeof val === "object") {
    return JSON.stringify(val, null, 2);
  }
  return String(val);
}

export function SearchDetailDrawer({ item, isOpen, onClose, onNavigate }: SearchDetailDrawerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!item) return null;

  const payload = item.detailPayload;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleNavigation = () => {
    onClose();
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md border-border bg-card p-6 overflow-y-auto z-[70]">
        <SheetHeader className="pb-4 border-b border-border space-y-1.5">
          <div className="flex items-center gap-2">
            {item.category === "AI_RESPONSE" ? (
              <Sparkles className="h-4 w-4 text-primary" />
            ) : item.category === "HITL_APPROVAL" ? (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            ) : item.category === "MODULE" ? (
              <FileText className="h-4 w-4 text-primary" />
            ) : (
              <Database className="h-4 w-4 text-emerald-600" />
            )}
            <Badge variant="outline" className="text-[10px] font-mono font-semibold">
              {item.category}
            </Badge>
          </div>
          <SheetTitle className="text-sm font-bold text-foreground font-heading leading-snug break-words">
            {item.title}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground break-words">
            {item.subtitle}
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {payload && (
            <div className="space-y-3">
              <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Entity Type</span>
                  <span className="font-semibold text-foreground">{payload.entityType || "Operational Record"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Entity Name</span>
                  <span className="font-semibold text-foreground truncate max-w-[220px]">{payload.entityName || "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Current Status</span>
                  <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20">
                    {payload.status || "ACTIVE"}
                  </Badge>
                </div>
              </div>

              {payload.metadata && Object.keys(payload.metadata).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground">Operational Parameters</span>
                  <div className="p-3 bg-card border border-border rounded-lg space-y-2 text-xs">
                    {Object.entries(payload.metadata).map(([key, val]) => {
                      const displayVal = formatValue(key, val);
                      const isLongText = displayVal.length > 50;

                      return (
                        <div key={key} className="py-1 border-b border-border/30 last:border-0">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-[11px] font-medium">
                              {formatKeyLabel(key)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(key, displayVal)}
                              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer"
                              title="Copy to clipboard"
                              aria-label={`Copy ${formatKeyLabel(key)}`}
                            >
                              {copiedKey === key ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <div className={`mt-0.5 font-medium text-foreground ${isLongText ? "text-[11px] whitespace-pre-wrap break-words bg-muted/20 p-2 rounded border border-border/40 font-mono mt-1" : "text-xs font-mono break-all"}`}>
                            {displayVal}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {item.href && (
            <div className="pt-3 border-t border-border flex justify-end">
              <Link href={item.href} onClick={handleNavigation}>
                <Button size="sm" className="h-8 text-xs font-semibold gap-1.5 cursor-pointer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Navigate to Workspace
                </Button>
              </Link>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
