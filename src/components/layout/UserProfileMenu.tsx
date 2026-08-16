"use client";

import React, { useState } from "react";
import Link from "next/link";
import { User, Settings, Shield, LogOut, X, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { isRouteAllowedForRole } from "@/lib/permissions";
import { useIsMobile } from "@/hooks/use-mobile";

export function UserProfileMenu() {
  const { user, logout, loading } = useAuth();
  const isMobile = useIsMobile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const getInitials = () => {
    if (!user?.fullName) {
      if (user?.email) return user.email.slice(0, 2).toUpperCase();
      return "U";
    }
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials();
  const canAccessUsers = isRouteAllowedForRole(user?.role, "/users");
  const canAccessSettings = isRouteAllowedForRole(user?.role, "/settings");

  // Mobile Bottom Sheet
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          data-testid="user-profile-mobile-trigger"
          aria-label="User Profile Menu"
          onClick={() => setSheetOpen(true)}
          className="relative h-8 w-8 rounded-full p-0 border border-border cursor-pointer touch-manipulation flex items-center justify-center shrink-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {loading ? "..." : initials}
            </AvatarFallback>
          </Avatar>
        </Button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl p-0 flex flex-col bg-popover border-t border-border shadow-2xl z-50 max-h-[85dvh]"
          >
            <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
              <SheetTitle className="text-sm font-bold text-foreground">
                Account & Identity
              </SheetTitle>
              <SheetClose className="rounded-sm opacity-70 hover:opacity-100 p-1">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </SheetHeader>

            {/* Profile Info Banner */}
            <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-3.5">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {loading ? "..." : initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">
                  {user?.fullName || (loading ? "Loading profile..." : "Signed-in User")}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || (loading ? "..." : "Authenticated Session")}
                </p>
                {user?.role && (
                  <span className="inline-block mt-1 text-[11px] font-semibold text-primary">
                    {user?.department ? `${user.department} • ` : ""}{user.role}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation List */}
            <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
              <Link
                href="/profile"
                onClick={() => setSheetOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors touch-manipulation min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Profile Settings</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              {canAccessUsers && (
                <Link
                  href="/users"
                  onClick={() => setSheetOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors touch-manipulation min-h-[48px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-foreground">
                      <Shield className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Roles & Permissions</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}

              {canAccessSettings && (
                <Link
                  href="/settings"
                  onClick={() => setSheetOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors touch-manipulation min-h-[48px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-foreground">
                      <Settings className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Company Preferences</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors touch-manipulation min-h-[48px] cursor-pointer mt-2"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-destructive/20 flex items-center justify-center text-destructive">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold">Sign out of Avenue REOS</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </button>
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
        data-testid="user-profile-trigger"
        aria-label="User Profile Menu"
        className={buttonVariants({
          variant: "ghost",
          className: "relative h-8 w-8 rounded-full p-0 border border-border cursor-pointer",
        })}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
            {loading ? "..." : initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 bg-popover border-border shadow-md" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none text-foreground truncate">
                {user?.fullName || (loading ? "Loading profile..." : "Signed-in User")}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user?.email || (loading ? "..." : "Authenticated Session")}
              </p>
              {user?.role && (
                <span className="inline-block mt-1 text-[10px] text-primary font-medium truncate">
                  {user?.department ? `${user.department} • ` : ""}{user.role}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="text-xs cursor-pointer p-0"
            render={
              <Link
                href="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center w-full px-2 py-1.5"
              />
            }
          >
            <User className="mr-2 h-3.5 w-3.5" />
            <span>Profile Settings</span>
          </DropdownMenuItem>

          {canAccessUsers && (
            <DropdownMenuItem
              className="text-xs cursor-pointer p-0"
              render={
                <Link
                  href="/users"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center w-full px-2 py-1.5"
                />
              }
            >
              <Shield className="mr-2 h-3.5 w-3.5" />
              <span>Roles & Permissions</span>
            </DropdownMenuItem>
          )}

          {canAccessSettings && (
            <DropdownMenuItem
              className="text-xs cursor-pointer p-0"
              render={
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center w-full px-2 py-1.5"
                />
              }
            >
              <Settings className="mr-2 h-3.5 w-3.5" />
              <span>Company Preferences</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs text-destructive focus:bg-destructive/10 cursor-pointer"
          onClick={() => {
            setDropdownOpen(false);
            logout();
          }}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
