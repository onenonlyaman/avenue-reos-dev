"use client";

import React from "react";
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
import { ExternalLink, ShieldAlert, Sparkles, Database, FileText } from "lucide-react";
import Link from "next/link";

interface SearchDetailDrawerProps {
  item: SearchResultItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SearchDetailDrawer({ item, isOpen, onClose }: SearchDetailDrawerProps) {
  if (!item) return null;

  const payload = item.detailPayload;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md border-border bg-card p-6 overflow-y-auto z-[60]">
        <SheetHeader className="pb-4 border-b border-border space-y-1">
          <div className="flex items-center gap-2">
            {item.category === "AI_RESPONSE" ? (
              <Sparkles className="h-4 w-4 text-purple-700" />
            ) : item.category === "HITL_APPROVAL" ? (
              <ShieldAlert className="h-4 w-4 text-amber-700" />
            ) : item.category === "MODULE" ? (
              <FileText className="h-4 w-4 text-primary" />
            ) : (
              <Database className="h-4 w-4 text-emerald-800" />
            )}
            <Badge variant="outline" className="text-[10px] font-bold">
              {item.category}
            </Badge>
          </div>
          <SheetTitle className="text-sm font-bold text-foreground font-heading">
            {item.title}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {item.subtitle}
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {payload && (
            <div className="space-y-3">
              <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Entity Type</span>
                  <span className="font-semibold text-foreground">{payload.entityType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Entity Name</span>
                  <span className="font-semibold text-foreground">{payload.entityName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Current Status</span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                    {payload.status}
                  </Badge>
                </div>
              </div>

              {payload.metadata && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground">Extracted Operational Parameters</span>
                  <div className="p-3 bg-card border border-border rounded-lg space-y-1 font-mono text-[11px]">
                    {Object.entries(payload.metadata).map(([key, val]) => (
                      <div key={key} className="flex justify-between py-0.5 border-b border-border/30 last:border-0">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-semibold text-foreground truncate max-w-[200px]">
                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {item.href && (
            <div className="pt-3 border-t border-border flex justify-end">
              <Link href={item.href} onClick={onClose}>
                <Button size="sm" className="h-8 text-xs font-semibold gap-1.5">
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
