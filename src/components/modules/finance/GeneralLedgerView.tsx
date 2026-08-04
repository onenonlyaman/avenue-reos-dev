"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, Plus, Calendar, FileText, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { financeApi, LedgerEntry } from "@/services/financeApi";
import { JournalPostingModal } from "./JournalPostingModal";
import { RecordFormModal } from "@/components/core/RecordFormModal";

const COST_CENTERS = [
  "All",
  "Gangapur Rd Concrete Head",
  "Indira Nagar Electricals",
  "Pathardi Phata Statutory",
];

export function GeneralLedgerView() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [costCenterFilter, setCostCenterFilter] = useState<string>("All");
  const [fiscalYear, setFiscalYear] = useState<string>("FY 2026-27");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isPostingModalOpen, setIsPostingModalOpen] = useState<boolean>(false);

  const [isRecordFormOpen, setIsRecordFormOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadLedger = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await financeApi.getLedgerEntries({
        search: searchQuery,
        costCenter: costCenterFilter,
        fiscalYear,
      });
      setEntries(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "General ledger entries could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [costCenterFilter, fiscalYear]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLedger();
  };

  const handleEntryPosted = (newEntry: LedgerEntry, requiresHitl: boolean) => {
    setEntries((prev) => [newEntry, ...prev]);
    if (requiresHitl) {
      setNotification(
        `Journal entry ${newEntry.entryNumber} (${newEntry.accountHead}) logged requiring CFO HITL sign-off due to high debit amount.`
      );
    } else {
      setNotification(`Journal entry ${newEntry.entryNumber} posted successfully to general ledger.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card text-card-foreground p-4 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by Entry ID, Account Head, Doc Ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            <Select value={costCenterFilter} onValueChange={(val) => val && setCostCenterFilter(val)}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-56">
                <SelectValue placeholder="Filter Cost Center" />
              </SelectTrigger>
              <SelectContent>
                {COST_CENTERS.map((cc) => (
                  <SelectItem key={cc} value={cc}>
                    {cc === "All" ? "All Cost Centers" : cc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fiscalYear} onValueChange={(val) => val && setFiscalYear(val)}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-36">
                <SelectValue placeholder="Fiscal Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FY 2026-27">FY 2026-27</SelectItem>
                <SelectItem value="FY 2025-26">FY 2025-26</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 self-end md:self-auto font-medium" onClick={() => setIsRecordFormOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Ledger Account
        </Button>

        <Button size="sm" className="h-9 text-xs gap-1.5 self-end md:self-auto" onClick={() => setIsPostingModalOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Journal Posting
        </Button>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            className="text-emerald-800 hover:text-emerald-950 font-bold ml-4 text-xs"
            onClick={() => setNotification(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading journal vouchers...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Ledger Retrieval Error"
          description={error}
          actionLabel="Retry"
          onAction={loadLedger}
        />
      ) : entries.length === 0 ? (
        <CorporateEmptyState
          title="No General Ledger Entries Found"
          description="No journal vouchers match the current filters."
          actionLabel="Post First General Ledger Entry"
          onAction={() => setIsPostingModalOpen(true)}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Posting Date</TableHead>
                <TableHead className="text-xs font-semibold">Voucher / Entry ID</TableHead>
                <TableHead className="text-xs font-semibold">Chart of Accounts Head</TableHead>
                <TableHead className="text-xs font-semibold">Cost Center</TableHead>
                <TableHead className="text-xs font-semibold text-right">Debit (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Credit (₹)</TableHead>
                <TableHead className="text-xs font-semibold">Posted By</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {entry.postingDate}
                  </TableCell>
                  <TableCell className="font-medium text-xs py-3">
                    <div className="font-mono text-foreground font-semibold">{entry.entryNumber}</div>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {entry.accountHead}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground">
                    {entry.costCenter}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-semibold text-foreground">
                    {entry.debitAmount > 0 ? `₹${(entry.debitAmount / 100000).toFixed(2)} L` : "—"}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-semibold text-foreground">
                    {entry.creditAmount > 0 ? `₹${(entry.creditAmount / 100000).toFixed(2)} L` : "—"}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground">
                    {entry.postedBy}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0.5 px-2 font-medium ${
                        entry.approvalStatus === "POSTED"
                          ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                          : entry.approvalStatus === "PENDING_HITL"
                          ? "bg-amber-50 text-amber-950 border-amber-300"
                          : "bg-red-50 text-red-950 border-red-300"
                      }`}
                    >
                      {entry.approvalStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <JournalPostingModal
        isOpen={isPostingModalOpen}
        onClose={() => setIsPostingModalOpen(false)}
        onEntryPosted={handleEntryPosted}
      />

      <RecordFormModal
        isOpen={isRecordFormOpen}
        onClose={() => setIsRecordFormOpen(false)}
        onSaved={loadLedger}
        title="Register Ledger Account"
        endpoint="/api/v1/finance/accounts"
        submitLabel="Register Account"
        fields={[
          { name: "accountCode", label: "Account Code", type: "text", required: true, halfWidth: true },
          { name: "accountType", label: "Account Class", type: "select", required: true, halfWidth: true, options: [
            { value: "ASSET", label: "Asset" },
            { value: "LIABILITY", label: "Liability" },
            { value: "EQUITY", label: "Equity" },
            { value: "REVENUE", label: "Revenue" },
            { value: "EXPENSE", label: "Expense" },
          ] },
          { name: "accountName", label: "Account Name", type: "text", required: true },
        ]}
      />
    </div>
  );
}

