"use client";

import React from "react";

interface CorporatePageHeaderProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  actions?: React.ReactNode;
}

export function CorporatePageHeader({
  title,
  subtitle,
  badgeText,
  actions,
}: CorporatePageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-6 border-b border-border">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground font-heading">
            {title}
          </h1>
          {badgeText && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
