"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Clock, RefreshCw, CheckSquare, AlertCircle, Loader2 } from "lucide-react";
import { hrApi, AttendanceRecord } from "@/services/hrApi";

export function AttendanceBiometricsView() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await hrApi.getAttendance();
      setAttendance(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Attendance logs could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncBiometrics = async () => {
    try {
      setIsSyncing(true);
      await hrApi.syncBiometrics();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Biometric sync failed");
    } finally {
      setIsSyncing(false);
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

          <Button size="sm" className="gap-1.5 text-xs font-semibold">
            <CheckSquare className="h-3.5 w-3.5" />
            Approve Leave Requests
          </Button>
        </div>
      </div>

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
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Employee Name</TableHead>
                <TableHead className="text-xs font-semibold">Site Location</TableHead>
                <TableHead className="text-xs font-semibold">Check-in Time</TableHead>
                <TableHead className="text-xs font-semibold">Check-out Time</TableHead>
                <TableHead className="text-xs font-semibold">Biometric Device Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Overtime Hours</TableHead>
                <TableHead className="text-xs font-semibold text-center">Attendance Status</TableHead>
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
      )}
    </div>
  );
}
