"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCatalogOptions } from "@/hooks/useCatalogOptions";

interface CatalogSelectProps {
  category: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  includeOptions?: string[];
}

export function CatalogSelect({
  category,
  value,
  onValueChange,
  placeholder = "Select",
  className = "h-8 text-xs w-full",
  includeOptions = [],
}: CatalogSelectProps) {
  const { values, isLoading } = useCatalogOptions(category);
  const merged = Array.from(new Set([...includeOptions, ...values]));

  return (
    <Select value={value} onValueChange={(val) => val && onValueChange(val)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {merged.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
        {merged.length === 0 && (
          <div className="px-2 py-3 text-[11px] text-muted-foreground">
            {isLoading ? "Loading options..." : "No entries configured. Add them under Settings."}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
