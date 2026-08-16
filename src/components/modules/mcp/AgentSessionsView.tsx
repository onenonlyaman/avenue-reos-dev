"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { RecordFormModal, RecordField } from "@/components/core/RecordFormModal";
import { Bot, AlertCircle, Loader2, RefreshCw, Search, ShieldCheck, Plus } from "lucide-react";
import { mcpApi, McpAgentSession } from "@/services/mcpApi";

const MCP_TOOL_FIELDS: RecordField[] = [
  {
    name: "toolName",
    label: "Tool Identifier / Method Name",
    type: "text",
    required: true,
    placeholder: "e.g. create_contractor_ra_bill",
  },
  {
    name: "targetModule",
    label: "Target ERP / Avenue Domain Module",
    type: "select",
    required: true,
    options: [
      { value: "Construction & WBS", label: "Construction & WBS" },
      { value: "Finance & Tally ERP", label: "Finance & Tally ERP" },
      { value: "CRM & Unit Inventory", label: "CRM & Unit Inventory" },
      { value: "Procurement & Materials", label: "Procurement & Materials" },
      { value: "HR & Workforce", label: "HR & Workforce" },
      { value: "Executive Analytics", label: "Executive Analytics" },
    ],
  },
  {
    name: "isMutative",
    label: "Mutative Write Operation",
    type: "select",
    required: true,
    options: [
      { value: "true", label: "Yes (Mutative Write)" },
      { value: "false", label: "No (Read-Only Query)" },
    ],
    halfWidth: true,
  },
  {
    name: "requiresHitl",
    label: "Requires Human-In-The-Loop Approval",
    type: "select",
    required: true,
    options: [
      { value: "true", label: "Yes (HITL Mandatory)" },
      { value: "false", label: "No (Autonomous Execution)" },
    ],
    halfWidth: true,
  },
  {
    name: "description",
    label: "Tool Capability & Execution Summary",
    type: "textarea",
    required: true,
    placeholder: "e.g. Submits verified running account bills against specific WBS milestone IDs.",
  },
];

export function AgentSessionsView() {
  const [sessions, setSessions] = useState<McpAgentSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await mcpApi.getSessions();
      setSessions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Agent sessions could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.agentTitle.toLowerCase().includes(q) ||
        s.assignedScope.toLowerCase().includes(q) ||
        s.originIp.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  const formatLastPing = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Recently active";
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "Active";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Auditing active AI agent sessions and authentication scopes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Agent Sessions Unreachable"
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
            Active Connected AI Agent Sessions & Scope Matrix
          </h3>
          <p className="text-xs text-muted-foreground">
            Authenticated multi-agent connections with role-scoped capabilities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search agent or scope..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Button
            size="sm"
            className="h-8 text-xs font-medium gap-1.5 shrink-0"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register Tool</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium gap-1.5 shrink-0"
            onClick={loadData}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <CorporateEmptyState
          title={searchQuery ? "No Matching Agent Sessions" : "No Active AI Agent Sessions"}
          description={
            searchQuery
              ? `No connected agent sessions match '${searchQuery}'.`
              : "No agent sessions currently active in database."
          }
          actionLabel={searchQuery ? "Clear Search" : "Register MCP Tool"}
          onAction={() => (searchQuery ? setSearchQuery("") : setIsCreateModalOpen(true))}
          icon={Bot}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Agent Title</TableHead>
                <TableHead className="text-xs font-semibold">Assigned Scope</TableHead>
                <TableHead className="text-xs font-semibold">Origin Transport</TableHead>
                <TableHead className="text-xs font-semibold">Permissions Level</TableHead>
                <TableHead className="text-xs font-semibold">Last Heartbeat</TableHead>
                <TableHead className="text-xs font-semibold text-center">Session Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <span>{s.agentTitle}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {s.assignedScope}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-xs text-muted-foreground">
                    {s.originIp}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <Badge variant="outline" className="text-[10px] font-bold border-border">
                      <ShieldCheck className="h-3 w-3 mr-1 text-primary" />
                      {s.permissionLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {formatLastPing(s.lastPing)}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        s.sessionStatus === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {s.sessionStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RecordFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={loadData}
        title="Register Model Context Protocol (MCP) Tool"
        endpoint="/api/v1/mcp/tools"
        fields={MCP_TOOL_FIELDS}
        transform={(data) => ({
          ...data,
          isMutative: data.isMutative === "true",
          requiresHitl: data.requiresHitl === "true",
        })}
        submitLabel="Register Tool in Registry"
        contextNote="Exposes a typed API execution tool to autonomous AI agents under strict tenant security."
      />
    </div>
  );
}
