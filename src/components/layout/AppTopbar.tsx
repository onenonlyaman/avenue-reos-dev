"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationPopover } from "./NotificationPopover";
import { UserProfileMenu } from "./UserProfileMenu";

export function AppTopbar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const getSegmentName = (slug: string) => {
    switch (slug) {
      case "crm-sales":
        return "CRM & Sales";
      case "finance":
        return "Finance & Accounting";
      case "construction":
        return "Construction & Sites";
      case "procurement-inventory":
        return "Procurement & Materials";
      case "hr-payroll":
        return "HR & Payroll";
      case "communications":
        return "Team Communications";
      default:
        return slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 w-full items-center justify-between border-b border-border bg-card px-4 shadow-xs">
      <div className="flex items-center gap-2.5">
        <SidebarTrigger className="h-8 w-8" />
        <Separator orientation="vertical" className="h-4 bg-border" />
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-muted-foreground hover:text-foreground">
                Avenue Builders
              </BreadcrumbLink>
            </BreadcrumbItem>
            {segments.length > 0 && <BreadcrumbSeparator />}
            {segments.map((seg, idx) => {
              const isLast = idx === segments.length - 1;
              const href = `/${segments.slice(0, idx + 1).join("/")}`;
              return (
                <React.Fragment key={seg}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="font-semibold text-foreground">
                        {getSegmentName(seg)}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={href} className="text-muted-foreground hover:text-foreground">
                        {getSegmentName(seg)}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex-1 max-w-sm mx-4 hidden md:block">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <NotificationPopover />
        <Separator orientation="vertical" className="h-4 bg-border" />
        <UserProfileMenu />
      </div>
    </header>
  );
}
