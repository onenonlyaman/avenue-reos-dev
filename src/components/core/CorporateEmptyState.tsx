"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";

interface CorporateEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export function CorporateEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = FolderOpen,
}: CorporateEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-lg border border-dashed border-border bg-card text-card-foreground my-4">
      <div className="h-12 w-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold font-heading text-foreground tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" className="h-8 text-xs font-semibold" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
