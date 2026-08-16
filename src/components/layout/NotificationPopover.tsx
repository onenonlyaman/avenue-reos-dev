"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, Check, ExternalLink, RefreshCw, AlertCircle, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notificationsApi, SystemNotification } from "@/services/notificationsApi";
import { useIsMobile } from "@/hooks/use-mobile";

function formatRelativeTime(isoDate: string): string {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "Recent";
  }
}

export function NotificationPopover() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "urgent" | "approvals">("all");
  const isMobile = useIsMobile();

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const data = await notificationsApi.getNotifications();
      setNotifications(data);
    } catch {
      setFetchError("Unable to sync notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpenChange = (open: boolean) => {
    if (isMobile) {
      setSheetOpen(open);
    } else {
      setPopoverOpen(open);
    }
    if (open) {
      fetchNotifications();
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === "urgent") return n.priority === "CRITICAL" || n.priority === "HIGH";
    if (filterTab === "approvals") return n.type === "APPROVAL_REQUEST" || n.type === "AI_AGENT_ACTION_REQUIRED";
    return true;
  });

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await notificationsApi.markAllAsRead();
    } catch {
      fetchNotifications();
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await notificationsApi.markAsRead(id);
    } catch {
      fetchNotifications();
    }
  };

  const getPriorityBadge = (priority: SystemNotification["priority"]) => {
    switch (priority) {
      case "CRITICAL":
        return <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-semibold">URGENT</Badge>;
      case "HIGH":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] py-0 px-1.5 font-semibold">HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold">NORMAL</Badge>;
      case "LOW":
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold">INFO</Badge>;
    }
  };

  const NotificationCard = ({ n, onClose }: { n: SystemNotification; onClose: () => void }) => (
    <div
      key={n.id}
      className={`p-3 text-xs flex flex-col gap-2 rounded-lg border transition-colors ${
        n.is_read ? "bg-card border-border/40" : "bg-muted/40 border-border shadow-xs"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {getPriorityBadge(n.priority)}
          <span className="text-[10px] text-muted-foreground font-medium uppercase truncate">
            {n.src_module}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
          {formatRelativeTime(n.timestamp)}
        </span>
      </div>
      <p className="text-foreground text-xs leading-relaxed break-words font-medium">{n.description}</p>
      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        <Link
          href={n.action_link}
          onClick={() => {
            if (!n.is_read) markAsRead(n.id);
            onClose();
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline touch-manipulation py-1"
        >
          View Details <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        {!n.is_read && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAsRead(n.id)}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer touch-manipulation"
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Mark read
          </Button>
        )}
      </div>
    </div>
  );

  // Mobile Bottom Sheet
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          aria-label="System Notifications"
          onClick={() => handleOpenChange(true)}
          className="relative h-8 w-8 text-foreground hover:bg-muted cursor-pointer touch-manipulation flex items-center justify-center shrink-0"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              <span className="sr-only">({unreadCount} unread notifications)</span>
            </>
          )}
        </Button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl h-[85dvh] max-h-[90dvh] p-0 flex flex-col bg-popover border-t border-border shadow-2xl z-50"
          >
            <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <SheetTitle className="text-sm font-bold text-foreground">
                  Notifications {unreadCount > 0 && `(${unreadCount} new)`}
                </SheetTitle>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Mark all read
                  </Button>
                )}
                <SheetClose className="rounded-sm opacity-70 hover:opacity-100 p-1">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>
            </SheetHeader>

            <div className="p-3 border-b border-border bg-muted/20 flex items-center gap-1 overflow-x-auto no-scrollbar">
              <Button
                variant={filterTab === "all" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5 cursor-pointer touch-manipulation shrink-0"
                onClick={() => setFilterTab("all")}
              >
                All ({notifications.length})
              </Button>
              <Button
                variant={filterTab === "urgent" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5 cursor-pointer touch-manipulation shrink-0"
                onClick={() => setFilterTab("urgent")}
              >
                Urgent ({notifications.filter((n) => n.priority === "CRITICAL" || n.priority === "HIGH").length})
              </Button>
              <Button
                variant={filterTab === "approvals" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5 cursor-pointer touch-manipulation shrink-0"
                onClick={() => setFilterTab("approvals")}
              >
                Approvals ({notifications.filter((n) => n.type === "APPROVAL_REQUEST" || n.type === "AI_AGENT_ACTION_REQUIRED").length})
              </Button>
            </div>

            {fetchError && (
              <div className="p-3 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between text-xs text-destructive">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fetchError}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchNotifications}
                  className="h-6 text-[10px] px-2 border-destructive/30 text-destructive hover:bg-destructive/20 cursor-pointer"
                >
                  Retry
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredNotifications.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  {filterTab === "all" ? "No active notifications" : `No ${filterTab} notifications`}
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <NotificationCard key={n.id} n={n} onClose={() => setSheetOpen(false)} />
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop Popover
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger
        aria-label="System Notifications"
        className={buttonVariants({
          variant: "ghost",
          size: "icon",
          className: "relative text-foreground hover:bg-muted cursor-pointer",
        })}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <>
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
            <span className="sr-only">({unreadCount} unread notifications)</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-popover border-border shadow-md" align="end" aria-live="polite">
        <div className="p-3 border-b border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1.5">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isLoading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground mr-1" />}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant={filterTab === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[11px] px-2 cursor-pointer"
              onClick={() => setFilterTab("all")}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filterTab === "urgent" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[11px] px-2 cursor-pointer"
              onClick={() => setFilterTab("urgent")}
            >
              Urgent ({notifications.filter((n) => n.priority === "CRITICAL" || n.priority === "HIGH").length})
            </Button>
            <Button
              variant={filterTab === "approvals" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[11px] px-2 cursor-pointer"
              onClick={() => setFilterTab("approvals")}
            >
              Approvals ({notifications.filter((n) => n.type === "APPROVAL_REQUEST" || n.type === "AI_AGENT_ACTION_REQUIRED").length})
            </Button>
          </div>
        </div>

        {fetchError && (
          <div className="p-3 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between text-xs text-destructive">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNotifications}
              className="h-6 text-[10px] px-2 border-destructive/30 text-destructive hover:bg-destructive/20 cursor-pointer"
            >
              Retry
            </Button>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {filterTab === "all" ? "No active notifications" : `No ${filterTab} notifications`}
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 text-xs flex flex-col gap-1.5 transition-colors ${
                  n.is_read ? "bg-background" : "bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getPriorityBadge(n.priority)}
                    <span className="text-[10px] text-muted-foreground font-medium uppercase truncate">
                      {n.src_module}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                    {formatRelativeTime(n.timestamp)}
                  </span>
                </div>
                <p className="text-foreground leading-snug break-words">{n.description}</p>
                <div className="flex items-center justify-between pt-1">
                  <Link
                    href={n.action_link}
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                      setPopoverOpen(false);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    View Details <ExternalLink className="h-3 w-3" />
                  </Link>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(n.id)}
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Check className="h-3 w-3 mr-1" /> Mark read
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
