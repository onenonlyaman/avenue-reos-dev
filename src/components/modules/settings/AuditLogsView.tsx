"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { FileText, AlertCircle, Loader2, Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { settingsApi, AuditTrailLog } from "@/services/settingsApi";

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditTrailLog[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (targetPage = page, query = searchQuery, filter = actionFilter) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await settingsApi.getAuditLogs({
        page: targetPage,
        limit: pageSize,
        search: query.trim() || undefined,
        actionType: filter !== "ALL" ? filter : undefined,
      });
      setLogs(res.logs);
      setTotalRecords(res.totalRecords);
      setPage(res.page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Audit trail logs could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, searchQuery, actionFilter);
  }, [actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(1, searchQuery, actionFilter);
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "Asia/Kolkata",
      }).format(d);
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Enterprise Security & Financial Audit Trail Engine
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            System actions, security overrides, and statutory journal updates.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search officer or target..."
              className="h-8 text-xs pl-8 pr-2 w-full"
            />
          </div>

          <Select value={actionFilter} onValueChange={(val) => val && setActionFilter(val)}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              <SelectItem value="Create">Create</SelectItem>
              <SelectItem value="Update">Update</SelectItem>
              <SelectItem value="Financial Approval">Financial Approval</SelectItem>
              <SelectItem value="HITL Override">HITL Override</SelectItem>
            </SelectContent>
          </Select>

          <Button type="submit" size="sm" variant="outline" className="h-8 text-xs px-2.5">
            Search
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => loadData(page, searchQuery, actionFilter)}
            title="Refresh logs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading audit trail from database...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Audit Ledger Register Error"
          description={error}
          actionLabel="Retry"
          onAction={() => loadData(page, searchQuery, actionFilter)}
          icon={AlertCircle}
        />
      ) : logs.length === 0 ? (
        <CorporateEmptyState
          title="No Security Audit Logs Found"
          description="No audit trail entries matched your search criteria."
          icon={FileText}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">IST Timestamp</TableHead>
                <TableHead className="text-xs font-semibold">Performing Officer</TableHead>
                <TableHead className="text-xs font-semibold">Module Executed</TableHead>
                <TableHead className="text-xs font-semibold text-center">Action Type</TableHead>
                <TableHead className="text-xs font-semibold">Target Entity / Details</TableHead>
                <TableHead className="text-xs font-semibold text-center">Origin IP</TableHead>
                <TableHead className="text-xs font-semibold text-center">Verification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => {
                let badgeStyle = "bg-slate-100 text-slate-800 border-slate-300";
                if (l.actionType === "Update") {
                  badgeStyle = "bg-blue-100 text-blue-800 border-blue-300";
                } else if (l.actionType === "Financial Approval") {
                  badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                } else if (l.actionType === "HITL Override") {
                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                }

                return (
                  <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-mono text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(l.timestamp)}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      {l.officerName}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {l.moduleExecuted}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] font-bold ${badgeStyle}`}>
                        {l.actionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-foreground font-medium">
                      {l.targetDescription}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                      {l.ipAddress}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono">
                      {l.securityVerified ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          Signed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold bg-slate-100 text-slate-700 border-slate-300">
                          Standard
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs">
            <span className="text-muted-foreground font-mono">
              Showing {logs.length} of {totalRecords} entries (Page {page} of {totalPages})
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1"
                onClick={() => loadData(page - 1, searchQuery, actionFilter)}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="h-3 w-3" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1"
                onClick={() => loadData(page + 1, searchQuery, actionFilter)}
                disabled={page >= totalPages || isLoading}
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

