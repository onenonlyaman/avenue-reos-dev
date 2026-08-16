"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Sparkles,
  Command,
  ArrowRight,
  Loader2,
  Database,
  ShieldAlert,
  Layers,
  AlertCircle,
  RotateCcw,
  BookOpen,
  DollarSign,
  HardHat,
  Package,
  TrendingUp,
  SlidersHorizontal,
  Compass,
  ArrowLeft,
  X,
} from "lucide-react";
import { parseSearchQuery, SearchScope } from "@/lib/searchParser";
import { searchApi, SearchResultItem } from "@/services/searchApi";
import { SearchDetailDrawer } from "./SearchDetailDrawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface GlobalCommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const FREQUENT_MODULES = [
  { name: "CRM & Sales", href: "/crm", icon: TrendingUp, desc: "Bookings, leads, demand notes" },
  { name: "Finance & Accounting", href: "/finance", icon: DollarSign, desc: "Cost centers, cash flows, ledgers" },
  { name: "Tally ERP Subsystem", href: "/finance/tally", icon: BookOpen, desc: "Chart of accounts, vouchers, GST" },
  { name: "Construction & Sites", href: "/construction", icon: HardHat, desc: "WBS schedule, RA bills, DPRs" },
  { name: "Procurement & Materials", href: "/procurement", icon: Package, desc: "Purchase orders, GRN, vendors" },
];

export function GlobalCommandSearch({ isOpen, onClose }: GlobalCommandSearchProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [activeScopeTab, setActiveScopeTab] = useState<SearchScope | null>(null);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const resultsListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parsed = parseSearchQuery(rawInput);
  const currentScope: SearchScope = activeScopeTab || parsed.scope;
  const isAiMode = parsed.isAI || currentScope === "ai";

  const executeQuery = useCallback(async (query: string, scope: SearchScope, signal?: AbortSignal) => {
    if (!query && scope !== "modules") {
      setResults([]);
      setIsLoading(false);
      setSearchError(null);
      return;
    }

    try {
      setIsLoading(true);
      setSearchError(null);
      if (scope === "ai") {
        if (!query.trim()) {
          setResults([]);
          return;
        }
        const aiRes = await searchApi.executeAiPrompt(query, signal);
        setResults(aiRes);
      } else {
        const data = await searchApi.executeSearch(query, scope, signal);
        setResults(data);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setSearchError("Unable to reach search services. Check connection or retry.");
      setResults([]);
    } finally {
      setIsLoading(false);
      setActiveIndex(-1);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (rawInput.trim() || activeScopeTab) {
        executeQuery(parsed.cleanQuery, currentScope, controller.signal);
      } else {
        setResults([]);
        setSearchError(null);
        setIsLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [rawInput, activeScopeTab, isOpen, parsed.cleanQuery, currentScope, executeQuery]);

  const handleClose = () => {
    setRawInput("");
    setActiveScopeTab(null);
    setResults([]);
    setSearchError(null);
    setActiveIndex(-1);
    setIsDrawerOpen(false);
    onClose();
  };

  const handleDirectNavigate = (href: string) => {
    handleClose();
    router.push(href);
  };

  const handleSelectItem = (item: SearchResultItem, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (item.href && (!e || (!e.shiftKey && !e.altKey))) {
      handleDirectNavigate(item.href);
      return;
    }
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const handleInspectItem = (item: SearchResultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (rawInput) {
        e.preventDefault();
        setRawInput("");
      } else {
        handleClose();
      }
      return;
    }

    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        handleSelectItem(results[activeIndex], e);
      }
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && resultsListRef.current) {
      const activeEl = resultsListRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const showPanels = rawInput.trim().length > 0 || activeScopeTab !== null;

  // Search Results List Shared Renderer
  const renderResultsList = () => (
    <div
      ref={resultsListRef}
      className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5 bg-card divide-y divide-border/30 pb-[calc(env(safe-area-inset-bottom,1.5rem)+4.5rem)] sm:pb-3"
    >
      {results.length === 0 && !isLoading && !searchError ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          {isAiMode && !rawInput.trim()
            ? "Type an instruction or query to evaluate with AI microservices."
            : "No matching records or modules found for your query."}
        </div>
      ) : (
        results.map((item, idx) => {
          const isFocused = idx === activeIndex;
          return (
            <div
              key={item.id}
              onClick={(e) => handleSelectItem(item, e)}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border touch-manipulation min-h-[56px] ${
                isFocused
                  ? "bg-accent text-accent-foreground border-border shadow-xs"
                  : "border-transparent hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {item.category === "AI_RESPONSE" ? (
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                ) : item.category === "HITL_APPROVAL" ? (
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                ) : item.category === "MODULE" ? (
                  <Layers className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Database className="h-4 w-4 text-emerald-600 shrink-0" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate font-mono">
                    {item.subtitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[9px] font-mono">
                  {item.category}
                </Badge>
                {item.detailPayload && (
                  <button
                    type="button"
                    onClick={(e) => handleInspectItem(item, e)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer touch-manipulation"
                    title="Inspect operational metadata"
                    aria-label="Inspect metadata"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // Onboarding Hub Shared Renderer
  const renderOnboardingHub = () => (
    <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-4 bg-card text-xs pb-[calc(env(safe-area-inset-bottom,1.5rem)+4.5rem)] sm:pb-3">
      {/* Discovery Hub Banner */}
      <div className="p-3.5 bg-primary/5 border border-primary/15 rounded-xl flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <Compass className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-foreground text-xs sm:text-sm">Getting Started in Avenue REOS</span>
            <Badge variant="outline" className="text-[9px] font-mono text-primary border-primary/20 shrink-0">
              OPERATE
            </Badge>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Jump straight to core real estate workflows or use prefixes to filter
          </div>
        </div>
      </div>

      {/* Frequently Used Workflows */}
      <div>
        <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase px-1 mb-2">
          Frequently Used Modules
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FREQUENT_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.href}
                onClick={() => handleDirectNavigate(mod.href)}
                className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-muted/40 border border-border/60 hover:border-border cursor-pointer transition-colors touch-manipulation min-h-[56px]"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-foreground truncate">{mod.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{mod.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Syntax Scope Legend & Safe Area Margin */}
      <div className="pt-3 border-t border-border flex flex-col gap-2 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="font-medium text-foreground">Scope prefixes:</span>
          <span className="inline-flex items-center gap-1">
            <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[10px]">m:</code> modules
          </span>
          <span className="inline-flex items-center gap-1">
            <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[10px]">r:</code> records
          </span>
          <span className="inline-flex items-center gap-1">
            <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[10px]">ai:</code> agents
          </span>
        </div>
        <div className="hidden sm:block text-[10px]">Press <kbd className="font-mono text-[9px] px-1 bg-muted rounded border border-border">?</kbd> for full keyboard shortcuts</div>
      </div>
    </div>
  );

  // 1. MOBILE NATIVE FULL-SCREEN EXPERIENCE
  if (isMobile && mounted) {
    if (!isOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-[100] h-dvh w-screen bg-card flex flex-col p-0 m-0 overflow-hidden font-sans">
        {/* Mobile Search Header - Fixed */}
        <div className="p-3 border-b border-border bg-card flex flex-col gap-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] shrink-0">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-10 w-10 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer touch-manipulation"
              aria-label="Close search"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center px-3 py-2 gap-2.5 flex-1 bg-muted/40 border border-border/80 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 rounded-xl transition-all">
              {isAiMode ? (
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <input
                ref={inputRef}
                autoFocus
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={
                  isAiMode
                    ? "Enter AI prompt..."
                    : "Search records, modules, POs..."
                }
                className="bg-transparent text-sm w-full outline-none text-foreground placeholder:text-muted-foreground font-medium"
              />
              {rawInput && (
                <button
                  type="button"
                  onClick={() => setRawInput("")}
                  className="text-muted-foreground hover:text-foreground p-1 cursor-pointer touch-manipulation"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              )}
            </div>
          </div>

          {/* Scope Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 pr-4">
            <Button
              variant={currentScope === "all" && !activeScopeTab ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-3 rounded-lg cursor-pointer touch-manipulation shrink-0"
              onClick={() => setActiveScopeTab(null)}
            >
              All
            </Button>
            <Button
              variant={currentScope === "modules" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-3 rounded-lg cursor-pointer touch-manipulation shrink-0"
              onClick={() => setActiveScopeTab("modules")}
            >
              Modules (m:)
            </Button>
            <Button
              variant={currentScope === "records" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-3 rounded-lg cursor-pointer touch-manipulation shrink-0"
              onClick={() => setActiveScopeTab("records")}
            >
              Records (r:)
            </Button>
            <Button
              variant={currentScope === "ai" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-3 rounded-lg cursor-pointer touch-manipulation shrink-0"
              onClick={() => setActiveScopeTab("ai")}
            >
              AI Agent (&gt;)
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {searchError && (
          <div className="p-3.5 m-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center justify-between text-xs text-destructive shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{searchError}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => executeQuery(parsed.cleanQuery, currentScope)}
              className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/20 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Retry
            </Button>
          </div>
        )}

        {/* Content Body - Scrollable */}
        {showPanels ? renderResultsList() : renderOnboardingHub()}

        <SearchDetailDrawer
          item={selectedItem}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onNavigate={handleClose}
        />
      </div>,
      document.body
    );
  }

  // 2. DESKTOP MODAL EXPERIENCE
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="sm:max-w-2xl border-border bg-card p-0 gap-0 overflow-hidden z-50 shadow-2xl rounded-xl max-h-[85vh] flex flex-col"
          aria-describedby="command-search-description"
        >
          <p id="command-search-description" className="sr-only">
            Search across real estate modules, sales bookings, contractor RA bills, and purchase orders.
          </p>
          <div className="w-full flex-1 flex flex-col min-h-0 max-h-[85vh] bg-card overflow-hidden">
            {/* Header & Search Bar - Fixed at top */}
            <div className="p-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center px-3 py-2 gap-2.5 w-full bg-muted/40 border border-border rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                {isAiMode ? (
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <input
                  ref={inputRef}
                  data-testid="global-search-input"
                  autoFocus
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isAiMode
                      ? "Enter AI prompt (e.g. check cement price variance)..."
                      : "Search modules, bookings, invoices (or prefix m:, r:, ai:)..."
                  }
                  className="bg-transparent text-xs w-full outline-none text-foreground placeholder:text-muted-foreground font-medium"
                />
                {rawInput && (
                  <button
                    type="button"
                    onClick={() => setRawInput("")}
                    className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : isAiMode ? (
                  <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/30 shrink-0">
                    AI
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <kbd className="h-5 px-1.5 text-[10px] font-mono font-medium text-muted-foreground bg-background border border-border rounded flex items-center shadow-xs">
                      <Command className="h-3 w-3 mr-0.5" />K
                    </kbd>
                  </div>
                )}
              </div>

              {/* Scope Tabs */}
              <div className="flex items-center justify-between pt-2.5 px-1 text-[11px]">
                <div className="flex items-center gap-1">
                  <Button
                    variant={currentScope === "all" && !activeScopeTab ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2.5 cursor-pointer"
                    onClick={() => setActiveScopeTab(null)}
                  >
                    All
                  </Button>
                  <Button
                    variant={currentScope === "modules" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2.5 cursor-pointer"
                    onClick={() => setActiveScopeTab("modules")}
                  >
                    Modules (m:)
                  </Button>
                  <Button
                    variant={currentScope === "records" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2.5 cursor-pointer"
                    onClick={() => setActiveScopeTab("records")}
                  >
                    Records (r:)
                  </Button>
                  <Button
                    variant={currentScope === "ai" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2.5 cursor-pointer"
                    onClick={() => setActiveScopeTab("ai")}
                  >
                    AI Agent (&gt;)
                  </Button>
                </div>

                <span className="text-[10px] text-muted-foreground">
                  <kbd className="font-mono text-[9px] px-1 bg-muted rounded border border-border">Enter</kbd> to jump · <kbd className="font-mono text-[9px] px-1 bg-muted rounded border border-border">Shift+Enter</kbd> to inspect
                </span>
              </div>
            </div>

            {/* Error State */}
            {searchError && (
              <div className="p-3 m-2 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between text-xs text-destructive shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeQuery(parsed.cleanQuery, currentScope)}
                  className="h-6 text-[10px] px-2 border-destructive/30 text-destructive hover:bg-destructive/20 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" /> Retry
                </Button>
              </div>
            )}

            {/* Content Body - Scrollable Middle Area */}
            {showPanels ? renderResultsList() : renderOnboardingHub()}

            {/* Desktop Footer - Fixed at bottom */}
            <div className="p-2.5 px-3 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {results.length > 0 ? (
                  <>Showing <strong className="text-foreground">{results.length}</strong> results</>
                ) : (
                  <>Ready to search</>
                )}
              </span>
              <span>
                <kbd className="font-mono text-[9px] px-1 bg-muted rounded border border-border">↑</kbd> <kbd className="font-mono text-[9px] px-1 bg-muted rounded border border-border">↓</kbd> to navigate · <kbd className="font-mono text-[9px] px-1 bg-muted rounded border border-border">Enter</kbd> to jump
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SearchDetailDrawer
        item={selectedItem}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={handleClose}
      />
    </>
  );
}
