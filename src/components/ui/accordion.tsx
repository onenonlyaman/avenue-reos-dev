"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextType {
  openItems: string[];
  toggleItem: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextType>({
  openItems: [],
  toggleItem: () => {},
});

export function Accordion({
  defaultValue = [],
  children,
  className,
}: {
  defaultValue?: string[];
  children: React.ReactNode;
  className?: string;
}) {
  const [openItems, setOpenItems] = React.useState<string[]>(defaultValue);

  const toggleItem = (val: string) => {
    setOpenItems((prev) => (prev.includes(val) ? prev.filter((i) => i !== val) : [...prev, val]));
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className={cn("space-y-1.5", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border border-border rounded-lg overflow-hidden bg-card", className)} data-value={value}>
      {children}
    </div>
  );
}

export function AccordionTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(AccordionContext);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    const parentItem = triggerRef.current?.closest("[data-value]");
    const val = parentItem?.getAttribute("data-value");
    if (val) {
      context.toggleItem(val);
    }
  };

  const parentItem = triggerRef.current?.closest("[data-value]");
  const val = parentItem?.getAttribute("data-value");
  const isOpen = val ? context.openItems.includes(val) : false;

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center justify-between p-3 text-xs font-semibold hover:bg-muted/40 transition-all text-left",
        className
      )}
    >
      {children}
      <ChevronDown
        className={cn("h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground", isOpen && "rotate-180")}
      />
    </button>
  );
}

export function AccordionContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(AccordionContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const parentItem = contentRef.current?.closest("[data-value]");
  const val = parentItem?.getAttribute("data-value");
  const isOpen = val ? context.openItems.includes(val) : true;

  return (
    <div
      ref={contentRef}
      className={cn("border-t border-border/60 bg-muted/10 p-2 text-xs", !isOpen && "hidden", className)}
    >
      {children}
    </div>
  );
}
