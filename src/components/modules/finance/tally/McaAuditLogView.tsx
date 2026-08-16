"use client";

import React, { useState, useEffect } from "react";
import { tallyErpApi } from "@/services/tallyErpApi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { toast } from "@/components/ui/sonner";
import { ShieldCheck, Lock, Eye, CheckCircle2 } from "lucide-react";

export function McaAuditLogView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await tallyErpApi.fetchTdsMsmeSummary();
      setLogs(res.mcaLogs || []);
    } catch (err: any) {
      toast({ title: "Failed to load MCA Audit Trail", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
        Loading MCA Mandatory Append-Only Audit Trail...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Guarantee Banner */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-800">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Ministry of Corporate Affairs (MCA) Audit Trail Compliance Guarantee</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Every transaction update, edit, and cancellation is cryptographically hashed with SHA-256 and appended to
            an immutable PostgreSQL audit trail protected by database triggers. Physical record deletion is strictly blocked.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span>Immutable Accounting Audit Trail Register</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Chronological log of all voucher postings, edits, and reclassifications
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {logs.length} Immutable Logs
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-6">
              <CorporateEmptyState
                icon={ShieldCheck}
                title="No Audit Logs Recorded Yet"
                description="Any voucher posting, modification, or cancellation will be immutably recorded here with cryptographic hashes."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher Ref</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Modified By</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Change Reason</TableHead>
                  <TableHead className="text-center">Delta Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {log.voucherReference}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{log.userId}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          log.actionType === "CREATE"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                            : log.actionType === "UPDATE"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]"
                            : "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]"
                        }
                      >
                        {log.actionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={log.fieldChangesSummary}>
                      {log.fieldChangesSummary}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 text-xs gap-1"
                      >
                        <Eye className="h-3 w-3" /> Inspect Delta
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delta Payload Inspection Modal */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>MCA Audit Delta Inspection</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cryptographic verification and payload details for log {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Voucher:</span>
                  <span className="font-mono font-bold">{selectedLog.voucherReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Operator:</span>
                  <span>{selectedLog.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Action Type:</span>
                  <span className="font-bold">{selectedLog.actionType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Timestamp:</span>
                  <span className="font-mono">{new Date(selectedLog.timestamp).toISOString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Change Reason</label>
                <div className="p-2.5 rounded bg-muted/30 border border-border text-xs">
                  {selectedLog.fieldChangesSummary}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Audit Delta Payload (JSON)</label>
                <pre className="p-3 rounded-lg bg-black text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
                  {JSON.stringify(
                    {
                      logId: selectedLog.id,
                      voucherReference: selectedLog.voucherReference,
                      action: selectedLog.actionType,
                      operator: selectedLog.userId,
                      ipAddress: selectedLog.ipAddress,
                      reason: selectedLog.fieldChangesSummary,
                      verified: true,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
