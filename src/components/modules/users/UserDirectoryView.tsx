"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import {
  Users,
  UserCheck,
  Shield,
  UserX,
  UserPlus,
  ShieldAlert,
  AlertCircle,
  Loader2,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { usersApi } from "@/services/usersApi";
import { UserProfile } from "@/services/authApi";
import { InviteUserModal } from "./InviteUserModal";
import { HITL_ELEVATED_AUTHORITY_LIMIT } from "@/lib/governance";

interface UserDirectoryViewProps {
  onOpenHitlDrawer: () => void;
  refreshVersion?: number;
  onRefreshPendingCount?: () => void;
}

export function UserDirectoryView({
  onOpenHitlDrawer,
  refreshVersion = 0,
  onRefreshPendingCount,
}: UserDirectoryViewProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Role Elevation / Modification Modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [targetRole, setTargetRole] = useState<string>("Governance Director");
  const [targetLimit, setTargetLimit] = useState<number>(HITL_ELEVATED_AUTHORITY_LIMIT);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleModalError, setRoleModalError] = useState<string | null>(null);

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

  useEffect(() => {
    let isMounted = true;
    usersApi
      .getUsers()
      .then((data) => {
        if (isMounted) setUsers(data);
      })
      .catch((err: unknown) => {
        if (isMounted) setError(err instanceof Error ? err.message : "User directory could not be loaded");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [refreshVersion]);

  const handleOpenRoleModal = (user: UserProfile) => {
    setSelectedUser(user);
    setTargetRole(user.role === "Governance Director" ? "Finance Lead" : "Governance Director");
    setTargetLimit(HITL_ELEVATED_AUTHORITY_LIMIT);
    setRoleModalError(null);
    setIsRoleModalOpen(true);
  };

  const handleRoleSubmit = async () => {
    if (!selectedUser) return;
    try {
      setIsUpdatingRole(true);
      setRoleModalError(null);
      const res = await usersApi.updateRole(
        { userId: selectedUser.id, userName: selectedUser.fullName },
        targetRole,
        targetLimit
      );
      setIsRoleModalOpen(false);
      if (res.requiresHitl) {
        if (onRefreshPendingCount) onRefreshPendingCount();
        onOpenHitlDrawer();
      } else {
        await loadData();
      }
    } catch (err: unknown) {
      setRoleModalError(err instanceof Error ? err.message : "Role could not be updated.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.siteLocation.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const pendingCount = users.filter((u) => u.status === "PENDING_APPROVAL").length;
  const govDirectors = users.filter((u) => u.role === "Governance Director" || u.role === "Super Admin").length;
  const suspendedCount = users.filter((u) => u.status === "SUSPENDED").length;

  const formatLastActive = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Never";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Never";
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Never";
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Administrative Employee User Directory & Role-Based Access Control (RBAC)
          </h3>
          <p className="text-xs text-muted-foreground">
            Identity governance, department assignments, and executive authority authorizations.
          </p>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search employees by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={(val) => { if (val) setRoleFilter(val); }}>
            <SelectTrigger className="h-8 text-xs w-[150px]">
              <SelectValue placeholder="Role Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="Governance Director">Governance Director</SelectItem>
              <SelectItem value="Site Engineer">Site Engineer</SelectItem>
              <SelectItem value="Construction Manager">Construction Manager</SelectItem>
              <SelectItem value="Procurement Manager">Procurement Manager</SelectItem>
              <SelectItem value="Finance Lead">Finance Lead</SelectItem>
              <SelectItem value="Legal Lead">Legal Lead</SelectItem>
              <SelectItem value="HR Manager">HR Manager</SelectItem>
              <SelectItem value="Sales Specialist">Sales Specialist</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {users.length === 0 ? (
        <CorporateEmptyState
          title="No Employee Users Registered"
          description="No employee records registered in the corporate directory."
          actionLabel="Invite New Employee"
          onAction={() => setIsInviteModalOpen(true)}
          icon={Users}
        />
      ) : filteredUsers.length === 0 ? (
        <CorporateEmptyState
          title="No Matching Employees Found"
          description="No employee records match the active search or filter criteria."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery("");
            setStatusFilter("ALL");
            setRoleFilter("ALL");
          }}
          icon={Search}
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
              {filteredUsers.map((u) => (
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
                    {formatLastActive(u.lastActive)}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    {u.status === "ACTIVE" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                        ACTIVE
                      </Badge>
                    ) : u.status === "PENDING_APPROVAL" ? (
                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
                        <ShieldAlert className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        PENDING
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold bg-destructive/10 text-destructive border-destructive/30">
                        SUSPENDED
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => handleOpenRoleModal(u)}
                      disabled={isUpdatingRole}
                    >
                      {u.role === "Governance Director" ? "Modify Role" : "Elevate Role"}
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Role Adjustment / Elevation Dialog */}
      <Dialog open={isRoleModalOpen} onOpenChange={(open) => !open && setIsRoleModalOpen(false)}>
        <DialogContent className="sm:max-w-[460px] border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Modify User Authorization & RBAC Role
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update {selectedUser?.fullName}&apos;s system role and financial authorization limits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {roleModalError && (
              <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded font-medium">
                {roleModalError}
              </div>
            )}

            <div className="p-3 bg-muted/20 rounded border border-border space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Employee:</span>
                <span className="font-semibold">{selectedUser?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Role:</span>
                <span className="font-mono font-semibold">{selectedUser?.role}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target-system-role" className="text-xs font-semibold">
                Target Role
              </Label>
              <Select value={targetRole} onValueChange={(val) => val && setTargetRole(val)}>
                <SelectTrigger id="target-system-role" className="h-8 text-xs">
                  <SelectValue placeholder="Select target role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Governance Director">Governance Director (Executive HITL)</SelectItem>
                  <SelectItem value="Site Engineer">Site Engineer</SelectItem>
                  <SelectItem value="Construction Manager">Construction Manager</SelectItem>
                  <SelectItem value="Procurement Manager">Procurement Manager</SelectItem>
                  <SelectItem value="Procurement Lead">Procurement Lead</SelectItem>
                  <SelectItem value="Facility Manager">Facility Manager</SelectItem>
                  <SelectItem value="Finance Lead">Finance Lead</SelectItem>
                  <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                  <SelectItem value="Legal Lead">Legal Lead</SelectItem>
                  <SelectItem value="HR Manager">HR Manager</SelectItem>
                  <SelectItem value="Sales Specialist">Sales Specialist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetRole === "Governance Director" && (
              <div className="p-3 rounded border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Executive Authorization Required
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Elevating this user to Governance Director will route the request to the Executive Safeguard Queue for Human-in-the-Loop review.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRoleModalOpen(false)}
              disabled={isUpdatingRole}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRoleSubmit}
              disabled={isUpdatingRole}
            >
              {isUpdatingRole ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm Role Assignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

