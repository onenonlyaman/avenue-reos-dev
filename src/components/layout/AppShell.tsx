"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { useAuth } from "@/context/AuthContext";
import { isRouteAllowedForRole, getHomeRouteForRole } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
}

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAuthPage) {
    return <div className="min-h-screen w-full bg-background font-sans">{children}</div>;
  }

  const isAllowed = isRouteAllowedForRole(user?.role, pathname);
  const homeRoute = getHomeRouteForRole(user?.role);

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "13rem" } as React.CSSProperties}>
      <div className="min-h-screen flex w-full bg-background text-foreground font-sans">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar />
          <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
            {!isAllowed ? (
              <div className="flex flex-col items-center justify-center flex-1 my-12 p-8 text-center border border-dashed border-border rounded-xl bg-card text-card-foreground">
                <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-4">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h2 className="text-base font-bold font-heading text-foreground">
                  Module Access Restricted
                </h2>
                <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6 leading-relaxed">
                  Your designated role (<span className="font-semibold text-foreground">{user?.role || "Restricted User"}</span>) does not have administrative authorization to access <span className="font-mono text-foreground">{pathname}</span>.
                </p>
                <Button size="sm" className="h-8 text-xs font-semibold" onClick={() => router.push(homeRoute)}>
                  Return to Authorized Workspace
                </Button>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
