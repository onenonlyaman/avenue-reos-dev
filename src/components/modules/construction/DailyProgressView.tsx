"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { HardHat, Plus, AlertCircle, Loader2, Calendar } from "lucide-react";
import { constructionApi, DailyProgressLog } from "@/services/constructionApi";
import { LogDprModal } from "./LogDprModal";

interface DailyProgressViewProps {
  projects: Array<{ id: string; name: string }>;
  selectedProject: string;
  onProjectChange: (project: string) => void;
}

export function DailyProgressView({
  projects,
  selectedProject,
  onProjectChange,
}: DailyProgressViewProps) {
  const [logs, setLogs] = useState<DailyProgressLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);

  const loadDprLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await constructionApi.getDprLogs(selectedProject, selectedDate);
      setLogs(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Site progress reports could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDprLogs();
  }, [selectedProject, selectedDate]);

  const handleDprLogged = (newLog: DailyProgressLog) => {
    setLogs((prev) => [newLog, ...prev]);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card text-card-foreground p-4 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Daily Progress Reports (DPR) & Site Shift Operations
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 self-end md:self-auto shrink-0">
          <div className="w-full sm:w-56">
            <Select value={selectedProject} onValueChange={(val) => val && onProjectChange(val)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-36">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>

          <Button size="sm" className="h-8 text-xs gap-1.5 font-medium shrink-0" onClick={() => setIsLogModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Log Daily Progress Report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading site progress reports...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="Site Progress Unavailable"
          description={error}
          actionLabel="Retry"
          onAction={loadDprLogs}
          icon={AlertCircle}
        />
      ) : logs.length === 0 ? (
        <CorporateEmptyState
          title="No Daily Progress Reports Found"
          description="There are currently no daily shift progress logs recorded for the selected site and date criteria."
          actionLabel="Log Daily Progress Report"
          onAction={() => setIsLogModalOpen(true)}
          icon={Calendar}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Report Date & Site</TableHead>
                <TableHead className="text-xs font-semibold">Supervising Engineer</TableHead>
                <TableHead className="text-xs font-semibold text-center">Labor Headcount</TableHead>
                <TableHead className="text-xs font-semibold text-center">Equipment Hours</TableHead>
                <TableHead className="text-xs font-semibold">Material Consumption</TableHead>
                <TableHead className="text-xs font-semibold">Shift Work Details</TableHead>
                <TableHead className="text-xs font-semibold text-center">Shift Progress %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-mono font-semibold text-foreground">
                    <div>{log.reportDate}</div>
                    <span className="text-[10px] font-sans text-muted-foreground font-normal">{log.projectName}</span>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {log.supervisingEngineer}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono">
                    <span className="font-bold text-foreground">{log.totalLaborCount}</span>
                    <span className="text-[10px] text-muted-foreground block">
                      ({log.skilledLaborCount} Skilled / {log.unskilledLaborCount} Unskilled)
                    </span>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-semibold text-foreground">
                    {log.equipmentHours} hrs
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    <div>Cement: {log.cementBags} Bags</div>
                    <div>Steel: {log.steelMt} MT | Concrete: {log.concreteM3} m³</div>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-foreground max-w-xs truncate">
                    {log.workDetails}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono font-bold text-emerald-800">
                    +{log.physicalProgressPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LogDprModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        projects={projects}
        selectedProject={selectedProject}
        onDprLogged={handleDprLogged}
      />
    </div>
  );
}
