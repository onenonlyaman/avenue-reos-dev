"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { useAuth } from "@/context/AuthContext";
import { ProjectProvider } from "@/context/ProjectContext";
import Link from "next/link";
import { isRouteAllowedForRole, getDefaultModuleForRole } from "@/lib/permissions";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
  defaultSidebarOpen?: boolean;
}

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AppShell({ children, defaultSidebarOpen = true }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAuthPage) {
    return <div className="min-h-screen w-full bg-background font-sans">{children}</div>;
  }

  // During initial auth resolution if user is pending, do not prematurely block
  const isAllowed = loading && !user ? true : isRouteAllowedForRole(user?.role, pathname);
  const defaultModule = getDefaultModuleForRole(user?.role);
  const homeRoute = defaultModule.homeRoute;

  return (
    <ProjectProvider>
      <SidebarProvider defaultOpen={defaultSidebarOpen}>
        <div className="min-h-screen flex w-full bg-background text-foreground font-sans">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <AppTopbar />
            <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
              {!isAllowed ? (
                <div className="flex flex-col items-center justify-center flex-1 my-12 p-8 text-center border border-dashed border-border rounded-xl bg-card text-card-foreground shadow-xs">
                  <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-4">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <h2 className="text-base font-bold font-heading text-foreground">
                    Module Access Restricted
                  </h2>
                  <p className="text-xs text-muted-foreground max-w-md mt-1 mb-2 leading-relaxed">
                    Your designated role (<span className="font-semibold text-foreground">{user?.role || "Restricted User"}</span>) does not have authorization to access <span className="font-mono font-medium text-foreground bg-muted px-1.5 py-0.5 rounded">{pathname}</span>.
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
                    Your primary authorized module is <span className="font-semibold text-foreground">{defaultModule.moduleName}</span>.
                  </p>
                  <Link
                    href={homeRoute}
                    className={buttonVariants({
                      size: "sm",
                      className: "h-8.5 px-4 text-xs font-semibold gap-2 shadow-xs cursor-pointer",
                    })}
                  >
                    <span>Open {defaultModule.moduleName}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                children
              )}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProjectProvider>
  );
}
