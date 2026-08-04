"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { GlobalCommandSearch } from "./GlobalCommandSearch";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <button
        data-testid="global-search-trigger"
        onClick={() => setOpen(true)}
        className="w-full max-w-sm flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground bg-muted/50 border border-border rounded-md hover:bg-muted transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5" />
          <span>Search modules, records, AI ask...</span>
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <GlobalCommandSearch isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
