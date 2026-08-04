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
  Settings,
  Activity,
  Bot,
  Sparkles,
  Plug,
  Users,
  MessageSquare,
  LayoutDashboard,
  Building2,
  LogOut,
  UserCheck,
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
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const navigationCategories = [
  {
    categoryName: "CORE OPERATIONS",
    items: [
      {
        name: "Dashboard Overview",
        href: "/",
        icon: LayoutDashboard,
        badge: "Main",
      },
      {
        name: "CRM & Sales",
        href: "/crm",
        icon: TrendingUp,
        badge: "Active",
      },
      {
        name: "Finance & Accounting",
        href: "/finance",
        icon: DollarSign,
        badge: "Active",
      },
      {
        name: "Construction & Sites",
        href: "/construction",
        icon: HardHat,
        badge: "Active",
      },
      {
        name: "Procurement & Materials",
        href: "/procurement",
        icon: Package,
        badge: "Active",
      },
      {
        name: "Property & Facility",
        href: "/facility",
        icon: KeyRound,
        badge: "Active",
      },
      {
        name: "HR & Payroll",
        href: "/hr",
        icon: Users,
        badge: "Active",
      },
      {
        name: "Team Communications",
        href: "/communications",
        icon: MessageSquare,
        badge: "Active",
      },
    ],
  },
  {
    categoryName: "GOVERNANCE & STRATEGY",
    items: [
      {
        name: "Land & Regulatory Legal",
        href: "/legal",
        icon: Landmark,
        badge: "Active",
      },
      {
        name: "Executive Analytics",
        href: "/analytics",
        icon: BarChart3,
        badge: "Active",
      },
    ],
  },
  {
    categoryName: "AI & ECOSYSTEM",
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
        badge: "Active",
      },
      {
        name: "External Integrations",
        href: "/integrations",
        icon: Plug,
        badge: "Active",
      },
    ],
  },
  {
    categoryName: "SYSTEM & IDENTITY",
    items: [
      {
        name: "User Directory",
        href: "/users",
        icon: UserCheck,
        badge: "RBAC",
      },
      {
        name: "My Profile",
        href: "/profile",
        icon: Settings,
        badge: "Identity",
      },
      {
        name: "System Administration",
        href: "/settings",
        icon: Settings,
        badge: "Active",
      },
      {
        name: "System Diagnostics",
        href: "/system-status",
        icon: Activity,
        badge: "SRE",
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <Sidebar className="border-r border-border bg-card text-card-foreground">
      <SidebarHeader className="h-12 border-b border-border px-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group w-full">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground text-xs shadow-xs">
            AB
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs tracking-tight text-foreground group-hover:text-primary transition-colors leading-none truncate">
              Avenue Builders
            </span>
            <span className="text-[9px] text-muted-foreground font-medium leading-none mt-0.5 truncate">
              Real Estate Platform
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1.5 py-2 space-y-4">
        {navigationCategories.map((group) => (
          <SidebarGroup key={group.categoryName} className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase px-2.5 py-1 mb-1">
              {group.categoryName}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        isActive={isActive}
                        className={`w-full h-8 px-2.5 py-1 text-xs rounded transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground font-medium shadow-xs"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Link href={item.href} className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate text-xs">{item.name}</span>
                          </div>
                          {item.badge && (
                            <Badge
                              variant={isActive ? "secondary" : "outline"}
                              className={`text-[9px] py-0 px-1 font-mono flex-shrink-0 ${
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border px-3 py-2.5 bg-muted/20">
        <div className="flex items-center justify-between gap-2 text-xs overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground text-[10px] flex-shrink-0 shadow-xs">
              {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : "AB"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1 min-w-0">
                <Building2 className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="font-semibold text-xs truncate leading-tight text-foreground">
                  {user?.fullName || "Enterprise Account"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                {user?.role || "Avenue Group"}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => logout()}
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
