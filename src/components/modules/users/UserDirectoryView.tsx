"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Users, UserCheck, Shield, UserX, UserPlus, ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import { usersApi } from "@/services/usersApi";
import { UserProfile } from "@/services/authApi";
import { InviteUserModal } from "./InviteUserModal";
import { HITL_PROCUREMENT_LIMIT } from "@/lib/governance";

interface UserDirectoryViewProps {
  onOpenHitlDrawer: () => void;
}

export function UserDirectoryView({ onOpenHitlDrawer }: UserDirectoryViewProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersApi.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "User directory could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleUpdate = async (userName: string, targetRole: string, limit?: number) => {
    try {
      setIsUpdatingRole(true);
      const res = await usersApi.updateRole(userName, targetRole, limit);
      if (res.requiresHitl) {
        onOpenHitlDrawer();
      } else {
        await loadData();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Role could not be saved");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading user directory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="User Directory Unreachable"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const pendingCount = users.filter((u) => u.status === "PENDING_APPROVAL").length;
  const govDirectors = users.filter((u) => u.role === "Governance Director").length;
  const suspendedCount = users.filter((u) => u.status === "SUSPENDED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Administrative Employee User Directory & Role-Based Access Control (RBAC)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={() => setIsInviteModalOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite New User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Total Active Users"
          value={activeCount.toString()}
          subtext="Corporate & Site Staff"
          icon={UserCheck}
          trend="Authenticated Sessions"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Pending Approvals"
          value={pendingCount.toString()}
          subtext="Awaiting Verification"
          icon={Users}
          trend="HR Onboarding Queue"
          trendDirection={pendingCount > 0 ? "down" : "up"}
        />

        <CorporateStatCard
          label="Governance Directors"
          value={govDirectors.toString()}
          subtext="Executive Privileges"
          icon={Shield}
          trend="HITL Approval Rights"
          trendDirection="up"
        />

        <CorporateStatCard
          label="Suspended Accounts"
          value={suspendedCount.toString()}
          subtext="Access Revoked"
          icon={UserX}
          trend="Security Policy Enforcement"
          trendDirection="up"
        />
      </div>

      {users.length === 0 ? (
        <CorporateEmptyState
          title="No Employee Users Registered"
          description="No employee records registered."
          actionLabel="Invite New Employee"
          onAction={() => setIsInviteModalOpen(true)}
          icon={Users}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Employee Name</TableHead>
                <TableHead className="text-xs font-semibold">Department</TableHead>
                <TableHead className="text-xs font-semibold">System Role</TableHead>
                <TableHead className="text-xs font-semibold">Primary Site Assignment</TableHead>
                <TableHead className="text-xs font-semibold">Last Active</TableHead>
                <TableHead className="text-xs font-semibold text-center">Account Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    <div>{u.fullName}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{u.email}</div>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {u.department}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-semibold">
                    <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {u.siteLocation}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {new Date(u.lastActive).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    {u.status === "ACTIVE" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                        ACTIVE
                      </Badge>
                    ) : u.status === "PENDING_APPROVAL" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300 gap-1">
                        <ShieldAlert className="h-3 w-3 text-amber-700" />
                        PENDING
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold bg-red-100 text-red-800 border-red-300">
                        SUSPENDED
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => handleRoleUpdate(u.fullName, "Governance Director", HITL_PROCUREMENT_LIMIT)}
                      disabled={isUpdatingRole}
                    >
                      Elevate Role
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={(newUser) => {
          setUsers((prev) => [newUser, ...prev]);
        }}
      />
    </div>
  );
}

