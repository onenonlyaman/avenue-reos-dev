"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Command } from "lucide-react";

interface ShortcutCategory {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutCategory[] = [
  {
    title: "Global Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open Command Palette / Search" },
      { keys: ["⌘", "P"], description: "Open Project / Site Switcher" },
      { keys: ["⌘", "B"], description: "Toggle Left Navigation Sidebar" },
      { keys: ["?"], description: "Show Keyboard Shortcuts & Help" },
    ],
  },
  {
    title: "Command Palette & Search",
    shortcuts: [
      { keys: ["↑", "↓"], description: "Navigate through search results" },
      { keys: ["Enter"], description: "Jump directly to target workspace" },
      { keys: ["Shift", "Enter"], description: "Inspect operational parameters / drawer" },
      { keys: ["Esc"], description: "Dismiss search, dialogs, or drawers" },
    ],
  },
  {
    title: "Search Scope Filters",
    shortcuts: [
      { keys: ["m:"], description: "Filter search strictly to Enterprise Modules" },
      { keys: ["r:"], description: "Search customer bookings, RA bills & POs" },
      { keys: ["ai:"], description: "Execute prompt with AI Agent / MCP tools" },
    ],
  },
];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in an input or textarea, don't trigger shortcut modal
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Keyboard shortcuts and documentation"
        onClick={() => setOpen(true)}
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg border-border bg-card p-6 shadow-2xl rounded-xl">
          <DialogHeader className="pb-3 border-b border-border space-y-1">
            <div className="flex items-center gap-2">
              <Command className="h-4 w-4 text-primary" />
              <DialogTitle className="text-base font-bold text-foreground">
                REOS Keyboard Shortcuts
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Keyboard shortcuts for navigating REOS. Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-foreground bg-background border border-border rounded shadow-2xs">?</kbd> to toggle this dialog.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </div>
                <div className="space-y-1.5 bg-muted/20 border border-border/50 rounded-lg p-2.5">
                  {group.shortcuts.map((sc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1 text-xs text-foreground"
                    >
                      <span className="text-muted-foreground font-medium">{sc.description}</span>
                      <div className="flex items-center gap-1">
                        {sc.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-foreground bg-background border border-border rounded shadow-2xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
