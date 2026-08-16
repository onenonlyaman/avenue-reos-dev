"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { getHomeRouteForRole } from "@/lib/permissions";
import { ProjectSelector } from "./ProjectSelector";
import { QuickActionsMenu } from "./QuickActionsMenu";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { GlobalSearch } from "./GlobalSearch";
import { GlobalCommandSearch } from "./GlobalCommandSearch";
import { NotificationPopover } from "./NotificationPopover";
import { UserProfileMenu } from "./UserProfileMenu";

const SEGMENT_TITLES: Record<string, string> = {
  crm: "CRM & Sales",
  "crm-sales": "CRM & Sales",
  finance: "Finance & Accounting",
  tally: "Tally ERP Subsystem",
  construction: "Sites & WBS Execution",
  procurement: "Procurement & Materials",
  "procurement-inventory": "Procurement & Materials",
  facility: "Property & Facility",
  legal: "Land Bank & Legal",
  hr: "HR & Payroll",
  "hr-payroll": "HR & Payroll",
  communications: "Team Communications",
  analytics: "Executive Analytics",
  mcp: "AI Agent Governance",
  "ai-intelligence": "Domain AI Services",
  integrations: "External Integrations",
  users: "User Directory",
  profile: "My Profile",
  settings: "System Administration",
  "system-status": "System Diagnostics",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AppTopbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const segments = pathname.split("/").filter(Boolean);
  const homeRoute = getHomeRouteForRole(user?.role);

  const getSegmentName = (slug: string) => {
    if (SEGMENT_TITLES[slug]) {
      return SEGMENT_TITLES[slug];
    }
    if (UUID_REGEX.test(slug)) {
      return `Ref #${slug.slice(0, 8)}`;
    }
    if (/^\d+$/.test(slug)) {
      return `Record #${slug}`;
    }
    return slug
      .replace(/-/g, " ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 w-full items-center justify-between border-b border-border bg-card px-2.5 sm:px-4 shadow-xs pt-[env(safe-area-inset-top,0px)]">
        {/* Left Anchor: Sidebar Trigger + Project Selector + Breadcrumbs */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <SidebarTrigger className="h-8 w-8 shrink-0 cursor-pointer touch-manipulation" />
          <Separator orientation="vertical" className="h-4 bg-border shrink-0" />
          
          {/* Project Selector (Icon button on mobile, dropdown on desktop) */}
          <ProjectSelector />

          <Separator orientation="vertical" className="h-4 bg-border shrink-0 hidden lg:block" />

          {/* Hierarchical Breadcrumbs (Desktop only) */}
          <Breadcrumb className="overflow-hidden hidden lg:block">
            <BreadcrumbList className="text-xs flex-nowrap overflow-hidden">
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbLink href={homeRoute} className="text-muted-foreground hover:text-foreground font-medium">
                  Avenue REOS
                </BreadcrumbLink>
              </BreadcrumbItem>
              {segments.length > 0 && <BreadcrumbSeparator className="shrink-0" />}
              {segments.map((seg, idx) => {
                const isLast = idx === segments.length - 1;
                const href = `/${segments.slice(0, idx + 1).join("/")}`;
                return (
                  <React.Fragment key={seg}>
                    <BreadcrumbItem className={isLast ? "min-w-0 truncate" : "shrink-0"}>
                      {isLast ? (
                        <BreadcrumbPage className="font-semibold text-foreground truncate max-w-[140px] xl:max-w-[220px]">
                          {getSegmentName(seg)}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={href} className="text-muted-foreground hover:text-foreground">
                          {getSegmentName(seg)}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator className="shrink-0" />}
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Centered Command Search Input (Desktop only) */}
        <div className="flex-1 max-w-sm mx-4 hidden md:block">
          <GlobalSearch onClick={() => setSearchOpen(true)} />
        </div>

        {/* Right Controls: Fast Action + Search Button + Shortcuts (Desktop) + Notifications + Profile */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Fast Action Create Menu (Bottom sheet on mobile, dropdown on desktop) */}
          <QuickActionsMenu />

          {/* Mobile Search Trigger Button (Opens native full-screen search) */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open Global Search"
            onClick={() => setSearchOpen(true)}
            className="md:hidden h-8 w-8 text-foreground hover:bg-muted cursor-pointer touch-manipulation flex items-center justify-center"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* In-App Keyboard Shortcuts & Help Documentation (Desktop only) */}
          <div className="hidden md:flex">
            <KeyboardShortcutsDialog />
          </div>

          {/* Live Notification Popover (Desktop) / Bottom Sheet (Mobile) */}
          <NotificationPopover />

          <Separator orientation="vertical" className="h-4 bg-border hidden sm:block" />

          {/* User Profile Menu (Desktop) / Bottom Sheet (Mobile) */}
          <UserProfileMenu />
        </div>
      </header>

      {/* Global Command Search Coordinator (Responsive full-screen mobile / centered desktop dialog) */}
      <GlobalCommandSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
