"use client";

import React, { useState } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SystemNotification {
  id: string;
  department: string;
  type: string;
  description: string;
  action_link: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  is_read: boolean;
  created_at: string;
}

const initialNotifications: SystemNotification[] = [
  {
    id: "notif-1",
    department: "Sales",
    type: "APPROVAL_REQUEST",
    description: "Gangapur Road Flat #402 reservation requires approval for 5% pricing discount.",
    action_link: "/crm-sales",
    priority: "HIGH",
    is_read: false,
    created_at: "10 mins ago"
  },
  {
    id: "notif-2",
    department: "Procurement",
    type: "APPROVAL_REQUEST",
    description: "Purchase Order #PO-4412 (₹35 Lakhs) for Steel Cement waiting for CFO review.",
    action_link: "/procurement-inventory",
    priority: "CRITICAL",
    is_read: false,
    created_at: "25 mins ago"
  },
  {
    id: "notif-3",
    department: "Construction",
    type: "UPDATE",
    description: "Daily Progress Report submitted for Pathardi Phata Site, Tower B, Floor 14.",
    action_link: "/construction",
    priority: "MEDIUM",
    is_read: true,
    created_at: "1 hour ago"
  }
];

export function NotificationPopover() {
  const [notifications, setNotifications] = useState<SystemNotification[]>(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
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

  return (
    <Popover>
      <PopoverTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "relative text-foreground hover:bg-muted" })}>
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover border-border shadow-md" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs py-0 px-1.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-xs text-muted-foreground hover:text-foreground">
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`p-3 text-xs flex flex-col gap-1.5 transition-colors ${n.is_read ? "bg-background" : "bg-muted/40"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getPriorityBadge(n.priority)}
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">{n.department}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{n.created_at}</span>
                </div>
                <p className="text-foreground leading-snug">{n.description}</p>
                <div className="flex items-center justify-between pt-1">
                  <a href={n.action_link} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                    View Details <ExternalLink className="h-3 w-3" />
                  </a>
                  {!n.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)} className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground">
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
