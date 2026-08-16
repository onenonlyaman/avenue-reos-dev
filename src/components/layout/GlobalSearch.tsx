"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { Search } from "lucide-react";

interface GlobalSearchProps {
  onClick: () => void;
}

function subscribe() {
  return () => {};
}

function getIsMacSnapshot() {
  if (typeof window === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

function getServerIsMacSnapshot() {
  return false;
}

export function GlobalSearch({ onClick }: GlobalSearchProps) {
  const isMac = useSyncExternalStore(subscribe, getIsMacSnapshot, getServerIsMacSnapshot);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClick();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onClick]);

  return (
    <button
      type="button"
      data-testid="global-search-trigger"
      aria-label="Search modules, records, and operations"
      onClick={onClick}
      className="w-full max-w-sm flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground bg-muted/40 border border-border rounded-md hover:bg-muted/80 hover:text-foreground transition-all cursor-pointer shadow-2xs"
    >
      <span className="flex items-center gap-2 min-w-0">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate">Search modules, records, AI agent...</span>
      </span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 shadow-2xs shrink-0">
        <span>{isMac ? "⌘" : "Ctrl"}</span>K
      </kbd>
    </button>
  );
}
