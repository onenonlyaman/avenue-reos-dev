"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  AlertTriangle,
  CornerDownRight,
  Sparkles,
} from "lucide-react";

export interface ApprovalField {
  label: string;
  value: React.ReactNode;
  isMono?: boolean;
  isBadge?: boolean;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
  badgeClassName?: string;
  colSpan?: 1 | 2;
}

export interface GenericApprovalItem<T = unknown> {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  categoryBadgeVariant?: "default" | "secondary" | "outline" | "destructive";
  categoryBadgeClassName?: string;
  amount?: number;
  amountFormatted?: string;
  status?: string;
  timestamp?: string;
  urgency?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  justification?: string;
  fields?: ApprovalField[];
  customContent?: React.ReactNode;
  raw?: T;
}

export interface ModularApprovalDrawerProps<T = unknown> {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;

  // Header configuration
  headerBadge?: string;
  headerBadgeClassName?: string;
  headerSubtitleBadge?: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  headerActions?: React.ReactNode;

  // Data Loading
  items?: GenericApprovalItem<T>[];
  loadItems?: () => Promise<T[]>;
  mapItem?: (rawItem: T) => GenericApprovalItem<T>;

  // Empty & Error States
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;

  // Action Labels & Defaults
  authorizeLabel?: string;
  rejectLabel?: string;
  rejectModalTitle?: string;
  rejectModalDescription?: string;
  rejectReasonPlaceholder?: string;
  defaultRejectReason?: string;
  requireRejectReason?: boolean;

  // High-consequence safety confirmation
  requireAuthConfirmation?: boolean;

  // Action Handlers
  onAuthorize: (id: string, rawItem?: T) => Promise<void>;
  onReject: (id: string, reason: string, rawItem?: T) => Promise<void>;

  // Custom Item Renderer (optional override)
  renderCustomItem?: (
    item: GenericApprovalItem<T>,
    rawItem: T | undefined,
    actions: {
      isProcessing: boolean;
      onAuthorize: () => Promise<void>;
      onOpenReject: () => void;
    }
  ) => React.ReactNode;
}

const formatIndianCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export function ModularApprovalDrawer<T = unknown>({
  isOpen,
  onClose,
  onRefresh,
  headerBadge,
  headerBadgeClassName = "bg-primary/10 text-primary border-primary/20 font-medium",
  headerSubtitleBadge,
  title,
  description,
  icon: HeaderIcon = ShieldCheck,
  headerActions,
  items: staticItems,
  loadItems,
  mapItem,
  emptyTitle = "No Pending Approvals",
  emptyDescription = "All requests in this queue have been reviewed and processed. New items requiring authorization will appear here.",
  emptyIcon = CheckCircle2,
  authorizeLabel = "Authorize",
  rejectLabel = "Reject",
  rejectModalTitle = "Record Rejection Reason",
  rejectModalDescription = "Document the policy, financial, or contract reason for rejecting this request. This justification is permanently logged to the compliance audit trail.",
  rejectReasonPlaceholder = "Explain why this request is rejected (e.g., budget variance, unverified site inspection, or missing rate contract)...",
  defaultRejectReason = "Rejected during executive verification review",
  requireRejectReason = false,
  requireAuthConfirmation = true,
  onAuthorize,
  onReject,
  renderCustomItem,
}: ModularApprovalDrawerProps<T>) {
  const [internalItems, setInternalItems] = useState<GenericApprovalItem<T>[]>([]);
  const [rawRecords, setRawRecords] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Safety Confirmation & State Guardrails
  const [confirmingAuthId, setConfirmingAuthId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Rejection Dialog State
  const [rejectingItem, setRejectingItem] = useState<GenericApprovalItem<T> | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchData = useCallback(async () => {
    if (!loadItems) {
      if (staticItems) setInternalItems(staticItems);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const rawData = await loadItems();
      setRawRecords(rawData);

      if (mapItem) {
        const mapped = rawData.map((raw) => {
          const item = mapItem(raw);
          return { ...item, raw };
        });
        setInternalItems(mapped);
      } else {
        setInternalItems(rawData as unknown as GenericApprovalItem<T>[]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to retrieve pending approval queue. Please retry.");
      setInternalItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadItems, mapItem, staticItems]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setRejectingItem(null);
      setRejectionReason("");
      setRejectError(null);
      setConfirmingAuthId(null);
      setActionErrors({});
      setSelectedIndex(0);
    }
  }, [isOpen, fetchData]);

  // Dismiss success banner after 4 seconds
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  const itemsToRender = staticItems || internalItems;

  // Keyboard navigation & power-user accelerators
  useEffect(() => {
    if (!isOpen || Boolean(rejectingItem) || itemsToRender.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, itemsToRender.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        const currentItem = itemsToRender[selectedIndex];
        if (currentItem && !processingId) {
          if (requireAuthConfirmation && confirmingAuthId !== currentItem.id) {
            setConfirmingAuthId(currentItem.id);
          } else {
            handleExecuteAuthorize(currentItem);
          }
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        const currentItem = itemsToRender[selectedIndex];
        if (currentItem && !processingId) {
          handleOpenRejectDialog(currentItem);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, rejectingItem, itemsToRender, selectedIndex, processingId, requireAuthConfirmation, confirmingAuthId]);

  // Auto-scroll active card into view when navigating via hotkeys
  useEffect(() => {
    if (cardRefs.current[selectedIndex]) {
      cardRefs.current[selectedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const handleAuthorizeClick = (item: GenericApprovalItem<T>) => {
    if (requireAuthConfirmation) {
      setConfirmingAuthId(item.id);
    } else {
      handleExecuteAuthorize(item);
    }
  };

  const handleExecuteAuthorize = async (item: GenericApprovalItem<T>) => {
    try {
      setProcessingId(item.id);
      setConfirmingAuthId(null);
      setActionErrors((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });

      await onAuthorize(item.id, item.raw);
      setSuccessBanner(`Authorized "${item.title}" — Stamped on corporate audit log.`);
      await fetchData();
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authorization failed. Please try again.";
      setActionErrors((prev) => ({ ...prev, [item.id]: msg }));
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenRejectDialog = (item: GenericApprovalItem<T>) => {
    setRejectingItem(item);
    setRejectionReason("");
    setRejectError(null);
    setConfirmingAuthId(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const trimmed = rejectionReason.trim();
    if (requireRejectReason && !trimmed) {
      setRejectError("A rejection reason is required for compliance audit records.");
      return;
    }

    try {
      setProcessingId(rejectingItem.id);
      setRejectError(null);
      const finalReason = trimmed || defaultRejectReason;
      await onReject(rejectingItem.id, finalReason, rejectingItem.raw);
      setSuccessBanner(`Rejected "${rejectingItem.title}" — Justification recorded in compliance log.`);
      setRejectingItem(null);
      setRejectionReason("");
      await fetchData();
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : "Rejection could not be processed. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 bg-card text-card-foreground border-border flex flex-col h-full overflow-hidden shadow-2xl"
        >
          {/* Drawer Header */}
          <SheetHeader className="p-4 sm:p-5 border-b border-border space-y-2 shrink-0 bg-muted/20">
            {(headerBadge || headerSubtitleBadge) && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {headerBadge && (
                  <Badge variant="outline" className={`text-xs font-mono py-0.5 px-2 ${headerBadgeClassName}`}>
                    {headerBadge}
                  </Badge>
                )}
                {headerSubtitleBadge && (
                  <span className="text-xs text-muted-foreground font-mono font-medium tracking-wide">
                    {headerSubtitleBadge}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="text-base font-bold font-heading text-foreground flex items-center gap-2">
                <HeaderIcon className="h-5 w-5 text-primary shrink-0" />
                <span>{title}</span>
              </SheetTitle>
              {headerActions}
            </div>
            <SheetDescription className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </SheetDescription>

            {/* Success Reassurance Banner */}
            {successBanner && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="flex-1">{successBanner}</span>
              </div>
            )}
          </SheetHeader>

          {/* Queue Body (Single Scroll Container with Safe-Area support) */}
          <div
            ref={containerRef}
            role="region"
            aria-label="Pending Approvals List"
            aria-live="polite"
            aria-busy={isLoading || Boolean(processingId)}
            className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto min-h-0"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-3">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <span className="font-medium">Loading pending verification queue...</span>
              </div>
            ) : error ? (
              <CorporateEmptyState
                title="Unable to Load Queue"
                description={error}
                actionLabel="Retry Queue"
                onAction={fetchData}
                icon={AlertCircle}
              />
            ) : itemsToRender.length === 0 ? (
              <CorporateEmptyState
                title={emptyTitle}
                description={emptyDescription}
                actionLabel="Check for Updates"
                onAction={fetchData}
                icon={emptyIcon}
              />
            ) : (
              <div className="space-y-4">
                {itemsToRender.map((item, idx) => {
                  const isProcessing = processingId === item.id;
                  const isGlobalBusy = Boolean(processingId);
                  const isConfirming = confirmingAuthId === item.id;
                  const isSelected = selectedIndex === idx;
                  const cardError = actionErrors[item.id];

                  if (renderCustomItem) {
                    return (
                      <React.Fragment key={item.id}>
                        {renderCustomItem(item, item.raw, {
                          isProcessing,
                          onAuthorize: () => handleExecuteAuthorize(item),
                          onOpenReject: () => handleOpenRejectDialog(item),
                        })}
                      </React.Fragment>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        cardRefs.current[idx] = el;
                      }}
                      onClick={() => setSelectedIndex(idx)}
                      className={`border rounded-lg p-3.5 sm:p-4 bg-muted/20 space-y-3 transition-all duration-200 ease-out ${
                        isSelected
                          ? "border-primary/60 ring-1 ring-primary/40 shadow-xs"
                          : "border-border hover:border-border/80"
                      }`}
                    >
                      {/* Card Header & Amount */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.category && (
                              <Badge
                                variant={item.categoryBadgeVariant || "outline"}
                                className={`text-xs font-semibold py-0.5 px-2 ${
                                  item.categoryBadgeClassName ||
                                  "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium"
                                }`}
                              >
                                {item.category}
                              </Badge>
                            )}
                            <span className="text-xs font-bold text-foreground truncate" title={item.title}>
                              {item.title}
                            </span>
                          </div>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground truncate" title={item.subtitle}>
                              {item.subtitle}
                            </p>
                          )}
                        </div>

                        {(item.amount !== undefined || item.amountFormatted) && (
                          <div className="text-right shrink-0">
                            <span className="text-sm font-mono font-extrabold text-primary block tracking-tight">
                              {item.amountFormatted ||
                                (item.amount !== undefined ? formatIndianCurrency(item.amount) : "")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Key-Value Fields Grid (Fluid Reflow) */}
                      {item.fields && item.fields.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/50 text-xs">
                          {item.fields.map((field, fIdx) => (
                            <div
                              key={fIdx}
                              className={field.colSpan === 2 ? "sm:col-span-2 space-y-0.5" : "space-y-0.5"}
                            >
                              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                                {field.label}
                              </span>
                              {field.isBadge ? (
                                <Badge
                                  variant={field.badgeVariant || "outline"}
                                  className={`text-xs ${field.badgeClassName || ""}`}
                                >
                                  {field.value}
                                </Badge>
                              ) : (
                                <span
                                  className={`text-xs text-foreground block truncate ${
                                    field.isMono ? "font-mono font-semibold" : ""
                                  }`}
                                  title={typeof field.value === "string" ? field.value : undefined}
                                >
                                  {field.value}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Justification / Audit Reason */}
                      {item.justification && (
                        <div className="p-2.5 bg-card/80 border border-border rounded text-xs text-muted-foreground font-mono leading-relaxed flex items-start gap-1.5">
                          <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="break-words">{item.justification}</span>
                        </div>
                      )}

                      {/* Custom Injected Content */}
                      {item.customContent}

                      {/* Isolated Card Error */}
                      {cardError && (
                        <div className="p-2 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{cardError}</span>
                        </div>
                      )}

                      {/* Inline Confirmation Guardrail */}
                      {isConfirming ? (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded space-y-2.5 animate-in fade-in zoom-in-98 duration-150">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>Confirm Executive Authorization</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-normal">
                            Authorize sign-off for <strong className="text-foreground">{item.title}</strong>
                            {item.amountFormatted || (item.amount ? ` (${formatIndianCurrency(item.amount)})` : "")}?
                            This action will be stamped permanently on the corporate audit ledger.
                          </p>
                          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 sm:h-8 text-xs min-h-[40px] sm:min-h-[32px] w-full sm:w-auto active:scale-[0.98] transition-transform"
                              onClick={() => setConfirmingAuthId(null)}
                              disabled={isProcessing}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-9 sm:h-8 text-xs min-h-[40px] sm:min-h-[32px] w-full sm:w-auto gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold active:scale-[0.98] transition-transform"
                              onClick={() => handleExecuteAuthorize(item)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Recording Sign-Off...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Confirm Authorization</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Default Action Footer (Responsive Layout) */
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-border/50">
                          <span className="text-xs text-muted-foreground font-mono">
                            Item {idx + 1} of {itemsToRender.length} in queue
                          </span>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Reject ${item.title}`}
                              className="h-9 sm:h-8 text-xs min-h-[40px] sm:min-h-[32px] flex-1 sm:flex-none text-destructive border-destructive/30 hover:bg-destructive/10 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-950/30 gap-1.5 cursor-pointer font-medium active:scale-[0.98] transition-transform"
                              onClick={() => handleOpenRejectDialog(item)}
                              disabled={isGlobalBusy}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {rejectLabel}
                            </Button>

                            <Button
                              size="sm"
                              aria-label={`Authorize ${item.title} ${
                                item.amountFormatted || (item.amount ? `for ${formatIndianCurrency(item.amount)}` : "")
                              }`}
                              className="h-9 sm:h-8 text-xs min-h-[40px] sm:min-h-[32px] flex-1 sm:flex-none gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 cursor-pointer font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-transform"
                              onClick={() => handleAuthorizeClick(item)}
                              disabled={isGlobalBusy}
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>{authorizeLabel}</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drawer Footer with Responsive Navigation & Accelerators */}
          {itemsToRender.length > 0 && !isLoading && (
            <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground font-mono shrink-0">
              <div className="hidden md:flex items-center gap-2 flex-wrap">
                <span>Shortcuts:</span>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs">J</kbd>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs">K</kbd>
                <span>Navigate</span>
                <span className="mx-1">•</span>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs">A</kbd>
                <span>Authorize</span>
                <span className="mx-1">•</span>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs">R</kbd>
                <span>Reject</span>
              </div>
              <div className="w-full md:w-auto text-center md:text-right">
                <span>{itemsToRender.length} Total Pending Decisions</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Rejection Justification Modal (Responsive Dialog) */}
      <Dialog open={Boolean(rejectingItem)} onOpenChange={(open) => !open && setRejectingItem(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md bg-card text-card-foreground p-5 sm:p-6 rounded-lg">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold font-heading flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {rejectModalTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {rejectModalDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3 text-xs">
            {rejectError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{rejectError}</span>
              </div>
            )}

            {rejectingItem && (
              <div className="p-2.5 bg-muted/50 border border-border rounded text-xs font-mono space-y-1">
                <div className="text-muted-foreground text-xs uppercase tracking-wider">Target Record:</div>
                <div className="font-semibold text-foreground truncate">{rejectingItem.title}</div>
                {rejectingItem.amountFormatted && (
                  <div className="text-primary font-bold">{rejectingItem.amountFormatted}</div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Statutory or Policy Justification:</span>
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={rejectReasonPlaceholder}
                className="text-xs min-h-24 leading-relaxed"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3 flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 sm:h-8 text-xs min-h-[40px] sm:min-h-[32px] w-full sm:w-auto"
              onClick={() => setRejectingItem(null)}
              disabled={Boolean(processingId)}
            >
              Keep in Queue
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-9 sm:h-8 text-xs min-h-[40px] sm:min-h-[32px] w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
              onClick={handleConfirmReject}
              disabled={Boolean(processingId)}
            >
              {processingId ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Recording Rejection...
                </span>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
