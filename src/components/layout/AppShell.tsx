"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

interface AppShellProps {
  children: React.ReactNode;
}

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAuthPage) {
    return <div className="min-h-screen w-full bg-background font-sans">{children}</div>;
  }

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "13rem" } as React.CSSProperties}>
      <div className="min-h-screen flex w-full bg-background text-foreground font-sans">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar />
          <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
