"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { communicationsApi, SupportTicket } from "@/services/communicationsApi";
import { useCatalogOptions } from "@/hooks/useCatalogOptions";

const DEFAULT_CATEGORIES = [
  "General Inquiry",
  "Possession Handover",
  "Billing Dispute",
  "Construction Quality",
  "Legal Notice",
];

const DEFAULT_DEPARTMENTS = [
  "Customer Care",
  "Site Operations",
  "Finance & Billing",
  "Legal & Compliance",
  "Quality Assurance",
];

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTicket: SupportTicket) => void;
}

export function CreateTicketModal({ isOpen, onClose, onSuccess }: CreateTicketModalProps) {
  const [customerName, setCustomerName] = useState("");
  const { values: ticketCategories } = useCatalogOptions("TICKET_CATEGORY");
  const { values: departments } = useCatalogOptions("DEPARTMENT");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General Inquiry");
  const [assignedDepartment, setAssignedDepartment] = useState("Customer Care");
  const [priority, setPriority] = useState<"CRITICAL" | "HIGH" | "STANDARD">("STANDARD");
  const [claimAmount, setClaimAmount] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = ticketCategories.length > 0 ? ticketCategories : DEFAULT_CATEGORIES;
  const depts = departments.length > 0 ? departments : DEFAULT_DEPARTMENTS;

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(category)) {
      setCategory(categories[0]);
    }
  }, [categories]);

  useEffect(() => {
    if (depts.length > 0 && !depts.includes(assignedDepartment)) {
      setAssignedDepartment(depts[0]);
    }
  }, [depts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !subject) {
      setError("Customer name and ticket subject are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await communicationsApi.createTicket({
        customerName,
        subject,
        category: category as any,
        assignedDepartment,
        priority,
        claimAmount: Number(claimAmount || 0),
      });
      onSuccess(created);
      onClose();
      setCustomerName("");
      setSubject("");
      setClaimAmount("0");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Support ticket could not be completed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Raise Customer Support & Dispute Ticket
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Customer / Buyer Name</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Rajesh Khanna (Unit A-402)"
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ticket Subject & Details</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Possession Handover Delay Inquiry"
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={category} onValueChange={(val) => val && setCategory(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assigned Department</Label>
              <Select value={assignedDepartment} onValueChange={(val) => val && setAssignedDepartment(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {depts.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority Level</Label>
              <Select value={priority} onValueChange={(val) => val && setPriority(val as any)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard Priority</SelectItem>
                  <SelectItem value="HIGH">High Priority</SelectItem>
                  <SelectItem value="CRITICAL">Critical Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dispute / Claim Amount (₹)</Label>
              <Input
                type="number"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Raise Ticket"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
