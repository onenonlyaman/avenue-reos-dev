"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import {
  History,
  PhoneCall,
  MessageSquare,
  Ticket,
  ShieldAlert,
  AlertCircle,
  Loader2,
  PlusCircle,
  Search,
} from "lucide-react";
import { communicationsApi, CustomerTimelineEntry } from "@/services/communicationsApi";

export function CustomerTimelineView() {
  const [timeline, setTimeline] = useState<CustomerTimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Form states for manual log
  const [customerName, setCustomerName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [interactionType, setInteractionType] = useState("Call Log");
  const [summary, setSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await communicationsApi.getCustomerTimeline();
      setTimeline(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Customer timeline could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !summary) {
      setFormError("Customer name and interaction summary are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      const created = await communicationsApi.createTimelineEntry({
        customerName,
        unitNumber: unitNumber || "General Account",
        interactionType,
        summary,
      });
      setTimeline((prev) => [created, ...prev]);
      setIsLogModalOpen(false);
      setCustomerName("");
      setUnitNumber("");
      setSummary("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Interaction could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTimeline = timeline.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.officerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "ALL" || item.interactionType === typeFilter;

    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading consolidated customer interaction history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Customer Timeline Unreachable"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Consolidated Customer Interaction Timeline
          </h3>
        </div>

        <Button
          size="sm"
          className="gap-1.5 text-xs font-semibold shrink-0"
          onClick={() => setIsLogModalOpen(true)}
        >
          <PlusCircle className="h-4 w-4" />
          Log Interaction Note
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, unit, summary, or officer..."
            className="h-8 pl-8 text-xs bg-card"
          />
        </div>

        <Select value={typeFilter} onValueChange={(val: string | null) => { if (val) setTypeFilter(val); }}>
          <SelectTrigger className="h-8 text-xs sm:w-[200px] bg-card">
            <SelectValue placeholder="All Interactions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Interactions</SelectItem>
            <SelectItem value="Call Log">Call Logs</SelectItem>
            <SelectItem value="Chat Message">Chat Messages</SelectItem>
            <SelectItem value="Support Ticket">Support Tickets</SelectItem>
            <SelectItem value="Legal Escalation">Legal Escalations</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredTimeline.length === 0 ? (
        <CorporateEmptyState
          title="No Customer Interactions Found"
          description="There are no interaction records matching your search query. Recorded calls, tickets, and disputes will automatically populate here."
          actionLabel="Log Interaction"
          onAction={() => setIsLogModalOpen(true)}
          icon={History}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Timestamp</TableHead>
                <TableHead className="text-xs font-semibold">Customer / Buyer Name</TableHead>
                <TableHead className="text-xs font-semibold">Unit / Ref</TableHead>
                <TableHead className="text-xs font-semibold">Interaction Type</TableHead>
                <TableHead className="text-xs font-semibold">Interaction Summary</TableHead>
                <TableHead className="text-xs font-semibold text-right">Logged By Officer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimeline.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {new Date(item.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {item.customerName}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {item.unitNumber}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <div className="flex items-center gap-1.5">
                      {item.interactionType === "Call Log" ? (
                        <PhoneCall className="h-3.5 w-3.5 text-blue-700" />
                      ) : item.interactionType === "Chat Message" ? (
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-700" />
                      ) : item.interactionType === "Support Ticket" ? (
                        <Ticket className="h-3.5 w-3.5 text-amber-700" />
                      ) : (
                        <ShieldAlert className="h-3.5 w-3.5 text-red-700" />
                      )}
                      <Badge variant="outline" className="text-[10px] font-medium border-border">
                        {item.interactionType}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground font-medium">
                    {item.summary}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right font-medium text-foreground">
                    {item.officerName}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Manual Interaction Logging Dialog */}
      <Dialog open={isLogModalOpen} onOpenChange={(open) => !open && setIsLogModalOpen(false)}>
        <DialogContent className="sm:max-w-[480px] border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Log Customer Interaction Event
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateInteraction} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Customer / Buyer Name</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Anand Mahindra"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unit Number / Account</Label>
                <Input
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. Tower B - 1402"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Interaction Type</Label>
                <Select value={interactionType} onValueChange={(val: string | null) => { if (val) setInteractionType(val); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Call Log">Call Log</SelectItem>
                    <SelectItem value="Chat Message">Chat Message</SelectItem>
                    <SelectItem value="Support Ticket">Support Ticket</SelectItem>
                    <SelectItem value="Legal Escalation">Legal Escalation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Interaction Summary / Discussion Notes</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Details of the discussion, grievance raised, or resolution guidance provided to buyer."
                className="text-xs min-h-[80px]"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLogModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Record Interaction"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
