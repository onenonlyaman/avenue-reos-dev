"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Command, ArrowRight, Loader2, Database, ShieldAlert, Layers } from "lucide-react";
import BorderGlow from "@/components/ui/BorderGlow";
import { parseSearchQuery, SearchScope } from "@/lib/searchParser";
import { searchApi, SearchResultItem } from "@/services/searchApi";
import { SearchDetailDrawer } from "./SearchDetailDrawer";

interface GlobalCommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalCommandSearch({ isOpen, onClose }: GlobalCommandSearchProps) {
  const [rawInput, setRawInput] = useState("");
  const [activeScopeTab, setActiveScopeTab] = useState<SearchScope | null>(null);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const parsed = parseSearchQuery(rawInput);
  const currentScope: SearchScope = activeScopeTab || parsed.scope;
  const isAiMode = parsed.isAI || currentScope === "ai";

  const executeQuery = useCallback(async (query: string, scope: SearchScope) => {
    if (!query && scope !== "modules") {
      setResults([]);
      return;
    }

    try {
      setIsLoading(true);
      if (scope === "ai") {
        const aiRes = await searchApi.executeAiPrompt(query || "Provide operational summary for Nashik site developments");
        setResults(aiRes);
      } else {
        const data = await searchApi.executeSearch(query, scope);
        setResults(data);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (rawInput || activeScopeTab) {
        executeQuery(parsed.cleanQuery, currentScope);
      } else {
        setResults([]);
      }
    }
  }, [rawInput, activeScopeTab, isOpen, parsed.cleanQuery, currentScope, executeQuery]);

  const handleSelectItem = (item: SearchResultItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const showPanels = rawInput.trim().length > 0 || activeScopeTab !== null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl border-transparent bg-transparent p-0 gap-0 overflow-visible z-50 shadow-none">
          <BorderGlow
            animated={isAiMode}
            borderRadius={16}
            colors={["#6366f1", "#38bdf8", "#a855f7"]}
            className="w-full"
          >
            <div className="w-full flex flex-col bg-card border border-border rounded-[16px] overflow-hidden shadow-2xl relative z-10">
              <div className="p-3 border-b border-border">
                <div className="flex items-center px-3 py-1.5 gap-2.5 w-full bg-muted/20 border border-border rounded-lg">
                  {isAiMode ? (
                    <Sparkles className="h-4 w-4 text-purple-700 animate-pulse shrink-0" />
                  ) : (
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <input
                    autoFocus
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder={
                      isAiMode
                        ? "Ask AI Agent microservices or query MCP tools... (e.g. ask: analyze steel price trend)"
                        : "Search modules, records, or prefix (m:, r:, ai:)..."
                    }
                    className="bg-transparent text-xs w-full outline-none text-foreground placeholder:text-muted-foreground font-medium"
                  />
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : isAiMode ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-purple-100 text-purple-900 border-purple-300 shrink-0">
                      AI AGENT MODE
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <kbd className="h-5 px-1.5 text-[10px] font-mono font-medium text-muted-foreground bg-card border border-border rounded flex items-center">
                        <Command className="h-3 w-3 mr-0.5" />K
                      </kbd>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 px-1 text-[11px]">
                  <div className="flex items-center gap-1">
                    <Button
                      variant={currentScope === "all" && !activeScopeTab ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setActiveScopeTab(null)}
                    >
                      All
                    </Button>
                    <Button
                      variant={currentScope === "modules" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setActiveScopeTab("modules")}
                    >
                      Modules (m:)
                    </Button>
                    <Button
                      variant={currentScope === "records" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setActiveScopeTab("records")}
                    >
                      Records (r:)
                    </Button>
                    <Button
                      variant={currentScope === "ai" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 text-[11px] px-2 text-purple-900 font-bold"
                      onClick={() => setActiveScopeTab("ai")}
                    >
                      AI Agent (&gt;)
                    </Button>
                  </div>

                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    Type prefix to switch scope
                  </span>
                </div>
              </div>

              {showPanels && (
                <div className="max-h-96 overflow-y-auto p-2 space-y-1 bg-card">
                  {results.length === 0 && !isLoading ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No matching modules, records, or AI microservice results found.
                    </div>
                  ) : (
                    results.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors border border-transparent hover:border-border"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.category === "AI_RESPONSE" ? (
                            <Sparkles className="h-4 w-4 text-purple-700 shrink-0" />
                          ) : item.category === "HITL_APPROVAL" ? (
                            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
                          ) : item.category === "MODULE" ? (
                            <Layers className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Database className="h-4 w-4 text-emerald-800 shrink-0" />
                          )}

                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">
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
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </BorderGlow>
        </DialogContent>
      </Dialog>

      <SearchDetailDrawer
        item={selectedItem}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
