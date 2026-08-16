"use client";

import React, { useState, useEffect } from "react";
import { Building2, ChevronDown, Check, Layers, Plus, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/context/ProjectContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";

export function ProjectSelector() {
  const { projects, selectedProjectId, selectedProject, setSelectedProjectId, isLoading } = useProject();
  const isMobile = useIsMobile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Keyboard shortcut ⌘P / Ctrl+P to trigger project selector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isMobile) {
          setSheetOpen((prev) => !prev);
        } else {
          setDropdownOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile]);

  const activeLabel = selectedProject ? selectedProject.projectName : "All Sites";

  const handleSelect = (id: string | null) => {
    setSelectedProjectId(id);
    setDropdownOpen(false);
    setSheetOpen(false);
  };

  // Mobile Bottom Sheet Experience
  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          data-testid="project-selector-mobile-trigger"
          aria-label="Select active project context"
          onClick={() => setSheetOpen(true)}
          className="h-8 w-8 p-0 relative bg-background hover:bg-muted/60 border-border text-foreground cursor-pointer shadow-2xs touch-manipulation flex items-center justify-center shrink-0"
        >
          <Building2 className={`h-4 w-4 ${selectedProject ? "text-primary" : "text-muted-foreground"}`} />
          {selectedProject && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl max-h-[85dvh] p-0 flex flex-col bg-popover border-t border-border shadow-2xl z-50"
          >
            <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <SheetTitle className="text-sm font-bold text-foreground">
                  Active Project Scope
                </SheetTitle>
              </div>
              <SheetClose className="rounded-sm opacity-70 hover:opacity-100 p-1">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </SheetHeader>

            <div className="p-3 border-b border-border bg-muted/20">
              <div
                onClick={() => handleSelect(null)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border touch-manipulation ${
                  selectedProjectId === null
                    ? "bg-accent border-border shadow-xs font-semibold"
                    : "border-transparent hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      All Sites / Portfolio View
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Global aggregation across all developments
                    </div>
                  </div>
                </div>
                {selectedProjectId === null && <Check className="h-4 w-4 text-primary shrink-0" />}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                Development Sites ({projects.length})
              </div>
              {projects.length === 0 && !isLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No project sites registered yet.
                </div>
              ) : (
                projects.map((p) => {
                  const isSelected = selectedProjectId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelect(p.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border touch-manipulation min-h-[48px] ${
                        isSelected
                          ? "bg-accent border-border shadow-xs"
                          : "border-border/40 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {p.projectName}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                            <span>{p.location || "Site"}</span>
                            {p.towers.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{p.towers.length} Towers</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {p.status}
                        </Badge>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-border bg-card">
              <Link href="/construction" onClick={() => setSheetOpen(false)} className="w-full">
                <Button className="w-full h-9 text-xs font-semibold gap-2 cursor-pointer touch-manipulation">
                  <Plus className="h-4 w-4" /> Add Project / Site
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop Dropdown Experience
  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger
        data-testid="project-selector-trigger"
        aria-label="Select active project context"
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "h-8 px-2.5 gap-1.5 bg-background hover:bg-muted/60 border-border text-xs font-semibold text-foreground max-w-[200px] truncate cursor-pointer shadow-2xs",
        })}
      >
        <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="truncate">{isLoading ? "Sites..." : activeLabel}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1 bg-popover border-border shadow-lg">
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Active Project Scope</span>
          <kbd className="font-mono text-[9px] px-1 py-0.5 bg-muted rounded border border-border">⌘P</kbd>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleSelect(null)}
          className={`flex items-center justify-between px-2.5 py-2 text-xs rounded-md cursor-pointer ${
            selectedProjectId === null ? "bg-accent font-semibold text-accent-foreground" : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="truncate">All Sites / Portfolio View</div>
              <div className="text-[10px] text-muted-foreground truncate">Global aggregation across all sites</div>
            </div>
          </div>
          {selectedProjectId === null && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="max-h-56 overflow-y-auto space-y-0.5">
          {projects.length === 0 && !isLoading ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No projects registered yet.
            </div>
          ) : (
            projects.map((p) => {
              const isSelected = selectedProjectId === p.id;
              return (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={`flex items-center justify-between px-2.5 py-2 text-xs rounded-md cursor-pointer ${
                    isSelected ? "bg-accent font-semibold text-accent-foreground" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{p.projectName}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 truncate">
                        <span>{p.location || "Site"}</span>
                        {p.towers.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{p.towers.length} Towers</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[9px] font-mono px-1 py-0">
                      {p.status}
                    </Badge>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator />

        <div className="p-1">
          <DropdownMenuItem
            className="p-0 cursor-pointer text-xs"
            render={
              <Link
                href="/construction"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center w-full px-2 py-1.5 text-primary font-medium hover:bg-primary/10 rounded"
              />
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            <span>Add Project / Site</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
