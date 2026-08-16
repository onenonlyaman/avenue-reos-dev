"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, PhoneCall, FileText, History, Plus, MoreHorizontal, Loader2, CalendarCheck, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { useCatalogOptions } from "@/hooks/useCatalogOptions";
import { RecordFormModal } from "@/components/core/RecordFormModal";

export interface TimelineLogEvent {
  id: string;
  stage: string;
  timestamp: string;
  actor: string;
  description: string;
  completed: boolean;
}

export interface LeadRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  interestedProject: string;
  unitType: string;
  budgetRange: string;
  leadScore: number;
  status: string;
  assignedRep: string;
  assignedRepId?: string | null;
  createdDate: string;
  events?: TimelineLogEvent[];
}

interface ProjectRecord {
  id: string;
  projectName: string;
  location: string;
}

interface LeadManagementViewProps {
  onSelectLeadForQuotation: (lead: LeadRecord) => void;
  onViewTimeline: (lead: LeadRecord) => void;
}

export function LeadManagementView({
  onSelectLeadForQuotation,
  onViewTimeline,
}: LeadManagementViewProps) {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const { values: leadSources } = useCatalogOptions("LEAD_SOURCE");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeLogModalLead, setActiveLogModalLead] = useState<LeadRecord | null>(null);
  const [activityStage, setActivityStage] = useState<string>("Phone Call");
  const [activityNotes, setActivityNotes] = useState<string>("");
  const [activityNextStatus, setActivityNextStatus] = useState<string>("");
  const [isLoggingActivity, setIsLoggingActivity] = useState<boolean>(false);

  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);

  const [isRecordFormOpen, setIsRecordFormOpen] = useState<boolean>(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadSource, setNewLeadSource] = useState("Web Form");
  const [newLeadProject, setNewLeadProject] = useState("");
  const [newLeadUnitType, setNewLeadUnitType] = useState("");
  const [newLeadBudgetMin, setNewLeadBudgetMin] = useState("");
  const [newLeadBudgetMax, setNewLeadBudgetMax] = useState("");
  const [newLeadAssignedRepId, setNewLeadAssignedRepId] = useState("");
  const [salesRepresentatives, setSalesRepresentatives] = useState<{ id: string; fullName: string }[]>([]);
  const [typologies, setTypologies] = useState<string[]>([]);

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/v1/projects");
      const envelope = await res.json();
      if (envelope.success && Array.isArray(envelope.data) && envelope.data.length > 0) {
        setProjects(envelope.data);
        setNewLeadProject(`${envelope.data[0].projectName} - ${envelope.data[0].location}`);
      }
    } catch {
      // Ignored non-blocking
    }
  };

  const loadSalesRepresentatives = async () => {
    try {
      const res = await fetch("/api/v1/hr/employees");
      const envelope = await res.json();
      if (envelope.success && Array.isArray(envelope.data)) {
        setSalesRepresentatives(
          envelope.data
            .filter((e: { status?: string }) => (e.status || "ACTIVE") === "ACTIVE")
            .map((e: { id: string; fullName: string }) => ({ id: e.id, fullName: e.fullName }))
        );
      }
    } catch {
      // Ignored non-blocking
    }
  };

  const loadTypologies = async () => {
    try {
      const res = await fetch("/api/v1/units");
      const envelope = await res.json();
      if (envelope.success && Array.isArray(envelope.data)) {
        const distinct = Array.from(
          new Set(envelope.data.map((u: { typology?: string }) => u.typology).filter(Boolean))
        ) as string[];
        setTypologies(distinct);
      }
    } catch {
      // Ignored non-blocking
    }
  };

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const query = new URLSearchParams();
      if (searchQuery.trim()) query.append("search", searchQuery.trim());
      if (statusFilter !== "All") query.append("status", statusFilter);
      if (sourceFilter !== "All") query.append("source", sourceFilter);

      const res = await fetch(`/api/v1/crm/leads?${query.toString()}`);
      const envelope = await res.json();
      if (envelope.success && Array.isArray(envelope.data)) {
        setLeads(envelope.data);
      } else {
        setLeads([]);
        if (envelope.error?.message) {
          setErrorMessage(envelope.error.message);
        }
      }
    } catch {
      setLeads([]);
      setErrorMessage("Unable to connect to prospect register.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadSalesRepresentatives();
    loadTypologies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, sourceFilter]);

  const handleIngestLead = async () => {
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      setErrorMessage("Prospect full name and contact number are required.");
      return;
    }

    try {
      setIsIngesting(true);
      setErrorMessage(null);
      const res = await fetch("/api/v1/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLeadName.trim(),
          email: newLeadEmail.trim(),
          phone: newLeadPhone.trim(),
          source: newLeadSource,
          interestedProject: newLeadProject,
          unitType: newLeadUnitType,
          budgetMinLakhs: newLeadBudgetMin,
          budgetMaxLakhs: newLeadBudgetMax,
          assignedRepId: newLeadAssignedRepId || undefined,
        }),
      });
      const envelope = await res.json();
      if (envelope.success) {
        setIsIngestModalOpen(false);
        setNewLeadName("");
        setNewLeadPhone("");
        setNewLeadEmail("");
        setNewLeadBudgetMin("");
        setNewLeadBudgetMax("");
        loadLeads();
      } else {
        setErrorMessage(envelope.error?.message || "Failed to record prospect.");
      }
    } catch {
      setErrorMessage("Failed to submit prospect record.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleLogActivity = async () => {
    if (!activeLogModalLead || !activityNotes.trim()) return;

    try {
      setIsLoggingActivity(true);
      const res = await fetch("/api/v1/crm/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: activeLogModalLead.id,
          action: "LOG_ACTIVITY",
          logEntry: {
            stage: activityStage,
            description: activityNotes.trim(),
            nextStatus: activityNextStatus || undefined,
          },
        }),
      });
      const envelope = await res.json();
      if (envelope.success) {
        setActiveLogModalLead(null);
        setActivityNotes("");
        setActivityNextStatus("");
        loadLeads();
      }
    } catch {
      // Log failure
    } finally {
      setIsLoggingActivity(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive flex items-center justify-between">
          <span>{errorMessage}</span>
          <button type="button" className="font-semibold text-xs ml-2" onClick={() => setErrorMessage(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-card text-card-foreground p-4 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by prospect name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-44">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Site Visit Scheduled">Site Visit Scheduled</SelectItem>
                <SelectItem value="Qualified">Qualified</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={(val) => val && setSourceFilter(val)}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-44">
                <SelectValue placeholder="Filter Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sources</SelectItem>
                <SelectItem value="Web Form">Web Form</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Property Portal">Property Portal</SelectItem>
                <SelectItem value="Walk-In">Walk-In</SelectItem>
                <SelectItem value="IVR Call">IVR Call</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 text-xs font-medium gap-1.5" onClick={() => setIsRecordFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Register Customer
          </Button>

          <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => setIsIngestModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Ingest New Lead
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading prospect register...</span>
        </div>
      ) : leads.length === 0 ? (
        <CorporateEmptyState
          title="No Prospect Records Found"
          description="No prospects match the current filter or search criteria."
          actionLabel="Ingest First Prospect Record"
          onAction={() => setIsIngestModalOpen(true)}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Lead Name</TableHead>
                <TableHead className="text-xs font-semibold">Contact Details</TableHead>
                <TableHead className="text-xs font-semibold">Interested Project & Type</TableHead>
                <TableHead className="text-xs font-semibold">Budget Range</TableHead>
                <TableHead className="text-xs font-semibold text-center">Score</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Assigned Representative</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-xs py-3">
                    <div>{lead.name}</div>
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <div className="text-foreground">{lead.phone}</div>
                    <div className="text-[10px] text-muted-foreground">{lead.email}</div>
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <div className="font-medium text-foreground">{lead.interestedProject || "General Inquiry"}</div>
                    <div className="text-[10px] text-muted-foreground">{lead.unitType || "Unspecified"}</div>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-foreground">
                    {lead.budgetRange}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        lead.leadScore >= 80
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : lead.leadScore >= 50
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : "bg-slate-100 text-slate-800 border border-slate-300"
                      }`}
                    >
                      {lead.leadScore}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0.5 px-2 font-medium ${
                        lead.status === "Qualified"
                          ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                          : lead.status === "Site Visit Scheduled"
                          ? "bg-blue-50 text-blue-900 border-blue-300"
                          : lead.status === "Contacted"
                          ? "bg-amber-50 text-amber-900 border-amber-300"
                          : "bg-slate-50 text-slate-900 border-slate-300"
                      }`}
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-foreground">{lead.assignedRep || "Unassigned"}</TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Prospect Actions
                          </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => {
                          setActiveLogModalLead(lead);
                          setActivityStage("Phone Call");
                          setActivityNotes("");
                          setActivityNextStatus(lead.status);
                        }}>
                          <PhoneCall className="h-3.5 w-3.5 mr-2" />
                          Log Activity
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSelectLeadForQuotation(lead)}>
                          <FileText className="h-3.5 w-3.5 mr-2" />
                          Generate Quotation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewTimeline(lead)}>
                          <History className="h-3.5 w-3.5 mr-2" />
                          View Timeline
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Activity Log Dialog */}
      <Dialog open={!!activeLogModalLead} onOpenChange={(open) => !open && setActiveLogModalLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold font-heading flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Log Customer Interaction
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record follow-up details for {activeLogModalLead?.name} ({activeLogModalLead?.phone}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Activity Type</Label>
              <Select value={activityStage} onValueChange={(val) => val && setActivityStage(val)}>
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue placeholder="Select Activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Phone Call">Phone Call / Discussion</SelectItem>
                  <SelectItem value="Site Visit Conducted">Site Visit Conducted</SelectItem>
                  <SelectItem value="Direct Meeting">In-Person Site Meeting</SelectItem>
                  <SelectItem value="WhatsApp Discussion">WhatsApp Message Follow-Up</SelectItem>
                  <SelectItem value="Requirement Review">Customer Requirement Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Discussion Notes & Feedback</Label>
              <Textarea
                placeholder="Document interaction summary, customer feedback, budget flexibility..."
                value={activityNotes}
                onChange={(e) => setActivityNotes(e.target.value)}
                className="min-h-[90px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Advance Lead Stage</Label>
              <Select value={activityNextStatus} onValueChange={(val) => val && setActivityNextStatus(val)}>
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue placeholder="Keep Current Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Site Visit Scheduled">Site Visit Scheduled</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setActiveLogModalLead(null)}>
              Cancel
            </Button>
            <Button size="sm" className="text-xs h-8" onClick={handleLogActivity} disabled={isLoggingActivity || !activityNotes.trim()}>
              {isLoggingActivity ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <MessageSquare className="h-3.5 w-3.5 mr-1" />}
              Save Activity Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ingest Lead Dialog */}
      <Dialog open={isIngestModalOpen} onOpenChange={setIsIngestModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold font-heading">
              Ingest New Prospect Record
            </DialogTitle>
            <DialogDescription className="sr-only">
              Capture prospect contact details and interest profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Full Name *</Label>
              <Input
                placeholder="e.g. Rajesh Sharma"
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phone Number *</Label>
                <Input
                  placeholder="+91 98220 12345"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email Address</Label>
                <Input
                  placeholder="prospect@company.com"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target Development Project</Label>
                <Select value={newLeadProject} onValueChange={(val) => val && setNewLeadProject(val)}>
                  <SelectTrigger className="h-8 text-xs w-full truncate">
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={`${p.projectName} - ${p.location}`}>
                        {p.projectName} - {p.location}
                      </SelectItem>
                    ))}
                    {projects.length === 0 && (
                      <div className="px-2 py-3 text-[11px] text-muted-foreground">
                        No active developments registered yet.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Preferred Typology</Label>
                <Select value={newLeadUnitType} onValueChange={(val) => val && setNewLeadUnitType(val)}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Select Typology" />
                  </SelectTrigger>
                  <SelectContent>
                    {typologies.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                    {typologies.length === 0 && (
                      <div className="px-2 py-3 text-[11px] text-muted-foreground">
                        No unit typologies registered yet.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Min Budget (₹ Lakhs)</Label>
                <Input
                  type="number"
                  placeholder="50.00"
                  value={newLeadBudgetMin}
                  onChange={(e) => setNewLeadBudgetMin(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Max Budget (₹ Lakhs)</Label>
                <Input
                  type="number"
                  placeholder="100.00"
                  value={newLeadBudgetMax}
                  onChange={(e) => setNewLeadBudgetMax(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Ingestion Source</Label>
                <Select value={newLeadSource} onValueChange={(val) => val && setNewLeadSource(val)}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Select Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSources.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    {leadSources.length === 0 && (
                      <div className="px-2 py-3 text-[11px] text-muted-foreground">No entries configured.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Assigned Representative</Label>
                <Select value={newLeadAssignedRepId} onValueChange={(val) => val && setNewLeadAssignedRepId(val)}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Select Rep" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {salesRepresentatives.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setIsIngestModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="text-xs h-8" onClick={handleIngestLead} disabled={isIngesting || !newLeadName.trim() || !newLeadPhone.trim()}>
              {isIngesting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Register Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordFormModal
        isOpen={isRecordFormOpen}
        onClose={() => setIsRecordFormOpen(false)}
        onSaved={loadLeads}
        title="Register Customer"
        endpoint="/api/v1/crm/customers"
        submitLabel="Register Customer"
        fields={[
          { name: "fullName", label: "Customer Name", type: "text", required: true },
          { name: "phoneNumber", label: "Contact Number", type: "text", required: true, halfWidth: true },
          { name: "email", label: "Email", type: "text", halfWidth: true },
          { name: "taxIdentifier", label: "PAN / GSTIN", type: "text", halfWidth: true },
          { name: "customerType", label: "Customer Type", type: "select", halfWidth: true, options: [
            { value: "INDIVIDUAL", label: "Individual" },
            { value: "CORPORATE", label: "Corporate" },
          ] },
        ]}
      />
    </div>
  );
}
