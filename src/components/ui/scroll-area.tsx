"use client";

import * as React from "react";

export function ScrollArea({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`overflow-y-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
