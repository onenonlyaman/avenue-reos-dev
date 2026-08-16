"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import { financeApi, JournalPostingPayload, LedgerEntry } from "@/services/financeApi";

interface JournalPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntryPosted: (entry: LedgerEntry, requiresHitl: boolean) => void;
}

interface AccountHeadOption {
  id: string;
  accountCode: string;
  accountName: string;
  formattedLabel: string;
}

interface CostCenterOption {
  id: string;
  costCenterCode: string;
  name: string;
  formattedLabel: string;
}

export function JournalPostingModal({
  isOpen,
  onClose,
  onEntryPosted,
}: JournalPostingModalProps) {
  const [accountOptions, setAccountOptions] = useState<AccountHeadOption[]>([]);
  const [costCenterOptions, setCostCenterOptions] = useState<CostCenterOption[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState<boolean>(true);

  const [postingDate, setPostingDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [accountHead, setAccountHead] = useState<string>("");
  const [costCenter, setCostCenter] = useState<string>("");
  const [debitAmount, setDebitAmount] = useState<number | "">(0);
  const [creditAmount, setCreditAmount] = useState<number | "">(0);
  const [documentRef, setDocumentRef] = useState<string>("");

  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDropdowns = async () => {
    try {
      setIsLoadingDropdowns(true);
      const [accRes, ccRes] = await Promise.all([
        fetch("/api/v1/finance/accounts").then((r) => r.json()),
        fetch("/api/v1/finance/cost-centers").then((r) => r.json()),
      ]);

      if (accRes.success && Array.isArray(accRes.data) && accRes.data.length > 0) {
        setAccountOptions(accRes.data);
        setAccountHead(accRes.data[0].formattedLabel);
      }

      if (ccRes.success && Array.isArray(ccRes.data) && ccRes.data.length > 0) {
        setCostCenterOptions(ccRes.data);
        setCostCenter(ccRes.data[0].formattedLabel);
      }
    } catch {
    } finally {
      setIsLoadingDropdowns(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDropdowns();
    }
  }, [isOpen]);

  const numDebit = typeof debitAmount === "number" ? debitAmount : 0;
  const requiresHitl = numDebit > 1000000;

  const handleSubmit = async () => {
    if (!documentRef.trim()) {
      setError("Supporting Document Reference is required for audit trail validation.");
      return;
    }

    if (!accountHead) {
      setError("Please select a valid Chart of Accounts Head.");
      return;
    }

    if (!costCenter) {
      setError("Please select a valid Cost Center.");
      return;
    }

    const numCredit = typeof creditAmount === "number" ? creditAmount : 0;
    if (numDebit <= 0 && numCredit <= 0) {
      setError("Please enter a positive debit or credit amount.");
      return;
    }

    try {
      setIsPosting(true);
      setError(null);

      const payload: JournalPostingPayload = {
        postingDate,
        accountHead,
        costCenter,
        debitAmount: numDebit,
        creditAmount: numCredit,
        documentRef: documentRef.trim(),
      };

      const result = await financeApi.postJournalEntry(payload);
      onEntryPosted(result.entry, result.requiresHitl);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Journal posting could not be saved");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-full p-6 bg-card text-card-foreground">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono">
              DOUBLE-ENTRY LEDGER POSTING
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              FY 2026-27
            </span>
          </div>
          <DialogTitle className="text-base font-bold font-heading">
            Record New General Ledger Voucher
          </DialogTitle>
          <DialogDescription className="sr-only">
            Enter verified financial voucher details for general ledger accounting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Posting Date</Label>
              <Input
                type="date"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Document Ref / PO #</Label>
              <Input
                placeholder="e.g. DOC-PO-9021"
                value={documentRef}
                onChange={(e) => setDocumentRef(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Chart of Accounts Head</Label>
            <Select value={accountHead} onValueChange={(val) => val && setAccountHead(val)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select Account Head" />
              </SelectTrigger>
              <SelectContent>
                {accountOptions.map((head) => (
                  <SelectItem key={head.id} value={head.formattedLabel}>
                    {head.formattedLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Cost Center Allocation</Label>
            <Select value={costCenter} onValueChange={(val) => val && setCostCenter(val)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select Cost Center" />
              </SelectTrigger>
              <SelectContent>
                {costCenterOptions.map((cc) => (
                  <SelectItem key={cc.id} value={cc.formattedLabel}>
                    {cc.formattedLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Debit Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={debitAmount}
                onChange={(e) => setDebitAmount(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
              <span className="text-[10px] text-muted-foreground block font-mono">
                = ₹{((numDebit || 0) / 100000).toFixed(2)} Lakhs
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Credit Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value ? parseFloat(e.target.value) : "")}
                className="h-8 text-xs font-mono"
              />
              <span className="text-[10px] text-muted-foreground block font-mono">
                = ₹{(((typeof creditAmount === "number" ? creditAmount : 0) || 0) / 100000).toFixed(2)} Lakhs
              </span>
            </div>
          </div>

          {requiresHitl && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold block mb-0.5">High-Value Posting Warning</span>
                Manual ledger entries exceeding ₹10 Lakhs mandate Human-In-The-Loop CFO sign-off prior to General Ledger posting.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-3 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose} disabled={isPosting}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={`h-8 text-xs font-medium ${requiresHitl ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
            onClick={handleSubmit}
            disabled={isPosting}
          >
            {isPosting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Posting Voucher...
              </span>
            ) : requiresHitl ? (
              "Submit for CFO Sign-Off"
            ) : (
              "Post Journal Entry"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
