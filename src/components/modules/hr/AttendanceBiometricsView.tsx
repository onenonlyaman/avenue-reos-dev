"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Clock, RefreshCw, CheckSquare, AlertCircle, Loader2 } from "lucide-react";
import { hrApi, AttendanceRecord, Employee } from "@/services/hrApi";

export function AttendanceBiometricsView() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [selectedEmpName, setSelectedEmpName] = useState<string>("");
  const [leaveReason, setLeaveReason] = useState<string>("Personal Leave");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [attData, empData] = await Promise.all([
        hrApi.getAttendance(),
        hrApi.getEmployees().catch(() => []),
      ]);
      setAttendance(attData);
      setEmployees(empData);
      if (empData.length > 0 && !selectedEmpName) {
        setSelectedEmpName(empData[0].fullName);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Attendance logs could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncBiometrics = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      setSuccessMessage(null);
      const result = await hrApi.syncBiometrics();
      await loadData();
      setSuccessMessage(`Biometric sync completed. Synchronized ${result.syncedCount} shift entries.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Biometric sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRecordLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpName) return;

    try {
      setIsSubmittingLeave(true);
      setError(null);
      await hrApi.recordLeave({
        employeeName: selectedEmpName,
        reason: leaveReason,
      });
      await loadData();
      setIsLeaveModalOpen(false);
      setSuccessMessage(`Approved leave recorded for ${selectedEmpName}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Leave could not be recorded");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Synchronizing site biometric attendance logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Biometric Service Unreachable"
        description={error}
        actionLabel="Retry Connection"
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
            Biometric Turnstile Attendance & Site Duty Pass Logs
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Turnstile punch times, GPS site validation, and daily shift records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={handleSyncBiometrics}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sync Biometric Logs
          </Button>

          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={() => setIsLeaveModalOpen(true)}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Approve Leave Request
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 rounded flex items-center justify-between">
          <span>{successMessage}</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSuccessMessage(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {attendance.length === 0 ? (
        <CorporateEmptyState
          title="No Biometric Attendance Logs"
          description="No attendance records ingested for the current shift. Click sync to poll biometric turnstiles at Gangapur Road and Pathardi Phata sites."
          actionLabel="Sync Biometric Logs"
          onAction={handleSyncBiometrics}
          icon={Clock}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Employee Name</TableHead>
                  <TableHead className="text-xs font-semibold">Site Location</TableHead>
                  <TableHead className="text-xs font-semibold">Shift Date</TableHead>
                  <TableHead className="text-xs font-semibold">Check-in Time</TableHead>
                  <TableHead className="text-xs font-semibold">Check-out Time</TableHead>
                  <TableHead className="text-xs font-semibold">Device Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Overtime Hours</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((rec) => (
                  <TableRow key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      {rec.employeeName}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {rec.siteLocation}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                      {rec.shiftDate || "Today"}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                      {rec.checkInTime}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                      {rec.checkOutTime}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono">
                      <Badge variant="outline" className="text-[10px] border-border">
                        {rec.deviceStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                      {rec.overtimeHours > 0 ? `+${rec.overtimeHours} hrs` : "0.0 hrs"}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      {rec.status === "PRESENT" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          PRESENT
                        </Badge>
                      ) : rec.status === "LATE" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                          LATE ENTRY
                        </Badge>
                      ) : rec.status === "ON_LEAVE" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-blue-100 text-blue-800 border-blue-300">
                          APPROVED LEAVE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                          ABSENT
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Leave Approval Dialog */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="sm:max-w-[440px] border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Approve Leave Request
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecordLeave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Employee</Label>
              <select
                value={selectedEmpName}
                onChange={(e) => setSelectedEmpName(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-border rounded px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.fullName}>
                    {emp.fullName} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Leave Justification / Reason</Label>
              <Input
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="e.g. Medical emergency / Casual leave"
                className="h-8 text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsLeaveModalOpen(false)} disabled={isSubmittingLeave}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingLeave}>
                {isSubmittingLeave ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Record Approved Leave"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
