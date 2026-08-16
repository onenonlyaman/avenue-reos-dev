"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CheckCircle2, XCircle, Loader2, UserCheck , Plus } from "lucide-react";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { financeApi, PendingDisbursement } from "@/services/financeApi";
import { RecordFormModal } from "@/components/core/RecordFormModal";

interface HITLDisbursementsViewProps {
  onOpenApprovalDrawer?: () => void;
}

export function HITLDisbursementsView({ onOpenApprovalDrawer }: HITLDisbursementsViewProps) {
  const [items, setItems] = useState<PendingDisbursement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [isVoucherFormOpen, setIsVoucherFormOpen] = useState<boolean>(false);

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await financeApi.getPendingApprovals();
      setItems(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Disbursement approval queue could not be loaded");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setIsProcessingId(id);
      await financeApi.authorizeDisbursement(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Disbursement could not be authorized");
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setIsProcessingId(id);
      await financeApi.rejectDisbursement(id, "Rejected via inline CFO approval table");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Disbursement could not be rejected");
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card text-card-foreground p-4 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold font-heading text-foreground">
              CFO Executive Disbursement Approval Queue
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 shrink-0 font-medium"
            onClick={() => setIsVoucherFormOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Raise Disbursement
          </Button>

          {onOpenApprovalDrawer && (
            <Button size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={onOpenApprovalDrawer}>
              <ShieldAlert className="h-3.5 w-3.5" />
              Open Approval Drawer
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading disbursement approvals...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Disbursement Queue Error"
          description={error}
          actionLabel="Retry Queue Connection"
          onAction={loadApprovals}
          icon={ShieldAlert}
        />
      ) : items.length === 0 ? (
        <CorporateEmptyState
          title="No Pending CFO Approvals"
          description="All high-value disbursements and budget overrides have been processed."
          icon={UserCheck}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Voucher Ref</TableHead>
                <TableHead className="text-xs font-semibold">Requesting Department</TableHead>
                <TableHead className="text-xs font-semibold">Project / Cost Center</TableHead>
                <TableHead className="text-xs font-semibold text-right">Disbursement Amount (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Over-Budget Impact</TableHead>
                <TableHead className="text-xs font-semibold text-right">Action Buttons</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs py-3 font-semibold text-foreground">
                    <div>{item.requestNumber}</div>
                    <span className="text-[10px] text-muted-foreground font-normal">{item.requestDate}</span>
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <div className="font-medium text-foreground">{item.vendorOrRecipient}</div>
                    <div className="text-[10px] text-muted-foreground">Req: {item.requestedBy}</div>
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <div className="text-foreground">{item.projectName}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{item.costCenter}</div>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-mono font-extrabold text-amber-800">
                    ₹{item.amountLakhs.toFixed(2)} Lakhs
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    <Badge variant="outline" className="bg-amber-50 text-amber-950 border-amber-300 text-[10px] font-medium">
                      {item.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isProcessingId === item.id}
                        className="h-7 text-[11px] px-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => handleReject(item.id)}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>

                      <Button
                        size="sm"
                        disabled={isProcessingId === item.id}
                        className="h-7 text-[11px] px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                        onClick={() => handleApprove(item.id)}
                      >
                        {isProcessingId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RecordFormModal
        isOpen={isVoucherFormOpen}
        onClose={() => setIsVoucherFormOpen(false)}
        onSaved={loadApprovals}
        title="Raise Disbursement Voucher"
        endpoint="/api/v1/finance/vouchers"
        submitLabel="Submit Voucher"
        contextNote="Disbursements above the executive limit route to the approval queue automatically."
        fields={[
          { name: "payeeName", label: "Payee", type: "text", required: true },
          { name: "disbursementAmount", label: "Amount (₹)", type: "number", required: true, halfWidth: true },
          { name: "category", label: "Category", type: "select", halfWidth: true, options: [
            { value: "Material Disbursement", label: "Material Disbursement" },
            { value: "Contractor Payment", label: "Contractor Payment" },
            { value: "Statutory Payment", label: "Statutory Payment" },
            { value: "Operating Expense", label: "Operating Expense" },
          ] },
          { name: "description", label: "Purpose", type: "textarea", required: true },
        ]}
      />
    </div>
  );
}

