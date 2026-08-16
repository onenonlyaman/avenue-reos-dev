"use client";

import React from "react";
import { BookScope } from "@/lib/accounting/multiBookScope";
import { Shield, BookOpen, Vault, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MultiBookScopeSelectorProps {
  currentScope: BookScope;
  onScopeChange: (scope: BookScope) => void;
  userRole?: string;
}

export function MultiBookScopeSelector({
  currentScope,
  onScopeChange,
  userRole = "ACCOUNTANT",
}: MultiBookScopeSelectorProps) {
  const normalized = (userRole || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const isInternalAuthorized =
    Boolean(normalized) &&
    (normalized.includes("DIRECTOR") ||
      normalized.includes("ADMIN") ||
      normalized.includes("FINANCE") ||
      normalized.includes("CFO") ||
      normalized.includes("OWNER") ||
      normalized.includes("ACCOUNTS") ||
      normalized.includes("GOVERNANCE"));

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 sm:p-3.5 bg-muted/30 border border-border/70 rounded-xl shadow-xs">
      <div className="flex items-start sm:items-center gap-2.5">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
          <Layers className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold tracking-tight text-foreground">Multi-Book Scope Filter</span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
              {currentScope === "STATUTORY" ? "System 1" : currentScope === "INTERNAL" ? "System 0" : "Dual-Stream"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2 sm:line-clamp-1">
            {currentScope === "STATUTORY"
              ? "Official Statutory Books: GST, MCA, Banking & Auditor Compliant"
              : currentScope === "INTERNAL"
              ? "Internal Books & Cash Vault: Cash movements, Deal splits & Treasury"
              : "Consolidated View: Combined real estate operational and financial posture"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:flex items-center gap-1.5 bg-background p-1 border border-border rounded-lg w-full md:w-auto">
        <button
          type="button"
          onClick={() => onScopeChange("STATUTORY")}
          className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[40px] sm:min-h-[32px] rounded-md text-[11px] sm:text-xs font-semibold transition-all ${
            currentScope === "STATUTORY"
              ? "bg-primary text-primary-foreground shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Statutory</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isInternalAuthorized) {
              onScopeChange("INTERNAL");
            }
          }}
          disabled={!isInternalAuthorized}
          title={!isInternalAuthorized ? "Requires Director / Finance Head clearance" : ""}
          className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[40px] sm:min-h-[32px] rounded-md text-[11px] sm:text-xs font-semibold transition-all ${
            currentScope === "INTERNAL"
              ? "bg-amber-600 text-white shadow-sm font-bold"
              : isInternalAuthorized
              ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              : "opacity-40 cursor-not-allowed text-muted-foreground"
          }`}
        >
          <Vault className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Internal Cash</span>
          {!isInternalAuthorized && <Shield className="h-3 w-3 shrink-0 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => {
            if (isInternalAuthorized) {
              onScopeChange("BOTH");
            }
          }}
          disabled={!isInternalAuthorized}
          title={!isInternalAuthorized ? "Requires Director / Finance Head clearance" : ""}
          className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[40px] sm:min-h-[32px] rounded-md text-[11px] sm:text-xs font-semibold transition-all ${
            currentScope === "BOTH"
              ? "bg-indigo-600 text-white shadow-sm font-bold"
              : isInternalAuthorized
              ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              : "opacity-40 cursor-not-allowed text-muted-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Both</span>
        </button>
      </div>
    </div>
  );
}
