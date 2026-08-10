"use client";

import React from "react";
import Link from "next/link";
import { User, Settings, Shield, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export function UserProfileMenu() {
  const { user, logout } = useAuth();
  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AB";

  const isSuperAdmin =
    user?.role === "Super Admin" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "Governance Director";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="user-profile-trigger"
        className={buttonVariants({ variant: "ghost", className: "relative h-8 w-8 rounded-full p-0 border border-border" })}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 bg-popover border-border shadow-md" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none text-foreground">
                {user?.fullName || "Aman Bele"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email || "aman.bele@avenuebuilders.in"}
              </p>
              <span className="inline-block mt-1 text-[10px] text-amber-700 font-medium">
                {user?.department || "Executive Administration"} • {user?.role || "Governance Director"}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="text-xs cursor-pointer p-0">
            <Link href="/profile" className="flex items-center w-full px-2 py-1.5">
              <User className="mr-2 h-3.5 w-3.5" />
              <span>Profile Settings</span>
            </Link>
          </DropdownMenuItem>

          {isSuperAdmin && (
            <>
              <DropdownMenuItem className="text-xs cursor-pointer p-0">
                <Link href="/users" className="flex items-center w-full px-2 py-1.5">
                  <Shield className="mr-2 h-3.5 w-3.5" />
                  <span>Roles & Permissions</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="text-xs cursor-pointer p-0">
                <Link href="/settings" className="flex items-center w-full px-2 py-1.5">
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  <span>Company Preferences</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs text-destructive focus:bg-destructive/10 cursor-pointer"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
