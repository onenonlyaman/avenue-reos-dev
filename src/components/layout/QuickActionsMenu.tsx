"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, UserPlus, ShoppingCart, HardHat, AlertTriangle, FileSpreadsheet, Wrench, X, ArrowRight } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";
import { isRouteAllowedForRole } from "@/lib/permissions";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuickActionItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
  category: string;
}

const ALL_QUICK_ACTIONS: QuickActionItem[] = [
  {
    name: "New Sales Booking / Lead",
    href: "/crm",
    icon: UserPlus,
    description: "Register customer unit booking & demand note",
    category: "CRM & Sales",
  },
  {
    name: "Raise Purchase Order",
    href: "/procurement",
    icon: ShoppingCart,
    description: "Issue vendor materials PO with BoQ items",
    category: "Procurement",
  },
  {
    name: "File Daily DPR / Site Log",
    href: "/construction",
    icon: HardHat,
    description: "Log labor headcounts, concrete pours & weather",
    category: "Construction",
  },
  {
    name: "Record Snag / Quality Flag",
    href: "/construction",
    icon: AlertTriangle,
    description: "Flag safety or workmanship defects on site",
    category: "Construction",
  },
  {
    name: "Post Financial Voucher",
    href: "/finance/tally",
    icon: FileSpreadsheet,
    description: "Journal entry, contractor payment & tax deduction",
    category: "Finance",
  },
  {
    name: "Log Property Service Ticket",
    href: "/facility",
    icon: Wrench,
    description: "Tenant maintenance request & CAM invoice",
    category: "Facility",
  },
];

export function QuickActionsMenu() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const allowedActions = ALL_QUICK_ACTIONS.filter((action) =>
    isRouteAllowedForRole(user?.role, action.href)
  );

  if (allowedActions.length === 0) return null;

  // Mobile Bottom Sheet Experience
  if (isMobile) {
    return (
      <>
        <Button
          size="icon"
          data-testid="quick-action-mobile-trigger"
          aria-label="Create new record"
          onClick={() => setSheetOpen(true)}
          className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-xs cursor-pointer touch-manipulation flex items-center justify-center shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl max-h-[85dvh] p-0 flex flex-col bg-popover border-t border-border shadow-2xl z-50"
          >
            <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <SheetTitle className="text-sm font-bold text-foreground">
                  Quick Actions & Records
                </SheetTitle>
              </div>
              <SheetClose className="rounded-sm opacity-70 hover:opacity-100 p-1">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {allowedActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.name}
                    href={action.href}
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-3.5 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors touch-manipulation min-h-[56px]"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground text-xs sm:text-sm truncate">
                        {action.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">
                        {action.description}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
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
        data-testid="quick-action-trigger"
        aria-label="Create new record"
        className={buttonVariants({
          size: "sm",
          className: "h-8 px-2.5 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-md shadow-xs cursor-pointer",
        })}
      >
        <Plus className="h-4 w-4" />
        <span>Create</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-1 bg-popover border-border shadow-lg">
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Quick Actions & Records
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="space-y-0.5">
          {allowedActions.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.name}
                className="p-0 cursor-pointer text-xs"
                render={
                  <Link
                    href={action.href}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-start gap-2.5 px-2.5 py-2 w-full rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  />
                }
              >
                <div className="h-7 w-7 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground truncate">{action.name}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-1">
                    {action.description}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
