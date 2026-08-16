"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  HardHat,
  Package,
  KeyRound,
  Landmark,
  BarChart3,
  Sliders,
  Activity,
  Bot,
  Sparkles,
  Plug,
  Users,
  MessageSquare,
  LayoutDashboard,
  LogOut,
  UserCheck,
  UserCircle,
  BookOpen,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { isRouteAllowedForRole } from "@/lib/permissions";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavCategory {
  categoryName: string;
  items: NavItem[];
}

const navigationCategories: NavCategory[] = [
  {
    categoryName: "OPERATIONS & SITES",
    items: [
      {
        name: "Sites & WBS Execution",
        href: "/construction",
        icon: HardHat,
      },
      {
        name: "Procurement & Materials",
        href: "/procurement",
        icon: Package,
      },
      {
        name: "Property & Facility",
        href: "/facility",
        icon: KeyRound,
      },
    ],
  },
  {
    categoryName: "COMMERCIAL & FINANCE",
    items: [
      {
        name: "Dashboard Overview",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        name: "CRM & Sales",
        href: "/crm",
        icon: TrendingUp,
      },
      {
        name: "Finance & Accounting",
        href: "/finance",
        icon: DollarSign,
      },
      {
        name: "Tally ERP Subsystem",
        href: "/finance/tally",
        icon: BookOpen,
        badge: "Tally",
      },
      {
        name: "HR & Payroll",
        href: "/hr",
        icon: Users,
      },
      {
        name: "Team Communications",
        href: "/communications",
        icon: MessageSquare,
      },
    ],
  },
  {
    categoryName: "GOVERNANCE & STRATEGY",
    items: [
      {
        name: "Land Bank & Legal",
        href: "/legal",
        icon: Landmark,
      },
      {
        name: "Executive Analytics",
        href: "/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    categoryName: "SYSTEM & ECOSYSTEM",
    items: [
      {
        name: "AI Agent Governance",
        href: "/mcp",
        icon: Bot,
        badge: "MCP",
      },
      {
        name: "Domain AI Services",
        href: "/ai-intelligence",
        icon: Sparkles,
      },
      {
        name: "External Integrations",
        href: "/integrations",
        icon: Plug,
      },
      {
        name: "User Directory",
        href: "/users",
        icon: UserCheck,
      },
      {
        name: "My Profile",
        href: "/profile",
        icon: UserCircle,
      },
      {
        name: "System Administration",
        href: "/settings",
        icon: Sliders,
      },
      {
        name: "System Diagnostics",
        href: "/system-status",
        icon: Activity,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const filteredCategories = React.useMemo(() => {
    if (!user?.role) return [];
    return navigationCategories
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => isRouteAllowedForRole(user.role, item.href)),
      }))
      .filter((group) => group.items.length > 0);
  }, [user]);

  const allItems = React.useMemo(
    () => filteredCategories.flatMap((group) => group.items),
    [filteredCategories]
  );

  const userInitials = React.useMemo(() => {
    if (user?.fullName) {
      const parts = user.fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return user.fullName.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  }, [user]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="h-12 border-b border-sidebar-border px-3 group-data-[collapsible=icon]:px-1 flex items-center justify-between">
        <Link
          href="/"
          aria-label="REOS - Real Estate Operating System Home"
          className="flex items-center gap-2.5 group w-full overflow-hidden group-data-[collapsible=icon]:justify-center"
        >
          <div className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground text-xs shadow-xs shrink-0">
            AB
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-xs tracking-tight text-sidebar-foreground group-hover:text-sidebar-primary transition-colors leading-none truncate">
              REOS
            </span>
            <span className="text-xs text-muted-foreground font-medium leading-none mt-1 truncate">
              Real Estate Operating System
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 space-y-4 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:space-y-2">
        {loading ? (
          <div
            className="space-y-4 px-1 py-1"
            role="status"
            aria-busy="true"
            aria-live="polite"
            aria-label="Loading authorized navigation modules"
          >
            {[1, 2, 3].map((section) => (
              <div key={section} className="space-y-1">
                <Skeleton className="h-3 w-24 mx-2.5 my-1 group-data-[collapsible=icon]:hidden" />
                <div className="space-y-0.5">
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                </div>
              </div>
            ))}
          </div>
        ) : (
          filteredCategories.map((group) => (
            <SidebarGroup key={group.categoryName} className="p-0">
              <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase px-2.5 py-1 mb-1 group-data-[collapsible=icon]:hidden">
                {group.categoryName}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const isExact = pathname === item.href;
                    const isChild = item.href !== "/" && pathname.startsWith(`${item.href}/`);
                    const hasMoreSpecificNavMatch = allItems.some(
                      (other) =>
                        other.href !== item.href &&
                        other.href.startsWith(`${item.href}/`) &&
                        (pathname === other.href || pathname.startsWith(`${other.href}/`))
                    );
                    const isActive = isExact || (isChild && !hasMoreSpecificNavMatch);
                    const Icon = item.icon;

                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.name}
                          render={
                            <Link
                              href={item.href}
                              className="flex items-center justify-between w-full"
                            />
                          }
                          className={`w-full h-8 px-2.5 py-1 text-xs rounded-md transition-colors ${
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-xs"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate flex-1 text-left group-data-[collapsible=icon]:hidden">{item.name}</span>
                          {item.badge && (
                            <Badge
                              variant={isActive ? "secondary" : "outline"}
                              className={`text-xs py-0 px-1.5 font-mono shrink-0 group-data-[collapsible=icon]:hidden ${
                                isActive
                                  ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground border-transparent"
                                  : "border-sidebar-border text-muted-foreground"
                              }`}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-2 bg-sidebar-accent/20 pb-[max(0.5rem,env(safe-area-inset-bottom))] group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-1.5">
        <div className="flex items-center justify-between gap-2 text-xs overflow-hidden group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
            <Link
              href="/profile"
              aria-label={user?.fullName ? `${user.fullName} - Account Profile` : "Account Profile"}
              title={user?.fullName ? `${user.fullName} (My Profile)` : "My Profile"}
              className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground text-xs shadow-xs shrink-0 hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-sidebar-ring outline-hidden"
            >
              {userInitials}
            </Link>
            <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-xs truncate leading-tight text-sidebar-foreground">
                {user?.fullName || user?.email || "Authenticated User"}
              </span>
              <span className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                {user?.role || "Authorized User"}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-sidebar-foreground shrink-0"
            onClick={() => logout()}
            aria-label="Sign out of account"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="sr-only">Sign out of account</span>
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
