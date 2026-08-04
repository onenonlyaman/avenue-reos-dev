"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Users, UserPlus, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { settingsApi, UserAccount, ProvisionUserPayload } from "@/services/settingsApi";
import { RolePermissionsModal } from "./RolePermissionsModal";

export function UserManagementView() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isProvisionOpen, setIsProvisionOpen] = useState<boolean>(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>("Rajesh Patil");
  const [corporateEmail, setCorporateEmail] = useState<string>("rajesh.patil@avenuebuilders.in");
  const [assignedRole, setAssignedRole] = useState<string>("Finance Manager");
  const [department, setDepartment] = useState<string>("Finance & Treasury");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsApi.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "User accounts could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProvisionUser = async () => {
    try {
      setIsSubmitting(true);
      setModalError(null);

      if (!fullName) throw new Error("Full name is required.");
      if (!corporateEmail) throw new Error("Corporate email is required.");

      const payload: ProvisionUserPayload = {
        fullName,
        corporateEmail,
        assignedRole,
        department,
      };

      await settingsApi.provisionUser(payload);
      setIsProvisionOpen(false);
      loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "User account could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            User Account Provisioning & Role-Based Access Control (RBAC)
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 font-medium"
            onClick={() => setIsMatrixOpen(true)}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Configure Role Permissions
          </Button>

          <Button
            size="sm"
            className="h-9 text-xs gap-1.5 font-medium"
            onClick={() => setIsProvisionOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Provision User Account
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading user accounts...</span>
        </div>
      ) : error ? (
        <CorporateEmptyState
          title="User Directory Error"
          description={error}
          actionLabel="Retry"
          onAction={loadData}
          icon={AlertCircle}
        />
      ) : users.length === 0 ? (
        <CorporateEmptyState
          title="No System Users Provisioned"
          description="No user accounts registered."
          actionLabel="Provision User Account"
          onAction={() => setIsProvisionOpen(true)}
          icon={Users}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">User Full Name</TableHead>
                <TableHead className="text-xs font-semibold">Corporate Email</TableHead>
                <TableHead className="text-xs font-semibold">Assigned System Role</TableHead>
                <TableHead className="text-xs font-semibold">Department</TableHead>
                <TableHead className="text-xs font-semibold text-center">Account Status</TableHead>
                <TableHead className="text-xs font-semibold text-center">Last Active Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs py-3 font-semibold text-foreground">
                    {u.fullName}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                    {u.corporateEmail}
                  </TableCell>
                  <TableCell className="text-xs py-3 font-medium text-foreground">
                    {u.assignedRole}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground">
                    {u.department}
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center">
                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                      {u.accountStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 text-center font-mono text-muted-foreground">
                    {u.lastActiveDate}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isProvisionOpen} onOpenChange={(open) => !open && setIsProvisionOpen(false)}>
        <DialogContent className="sm:max-w-md w-full p-6 bg-card text-card-foreground">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold font-heading">
              Provision User Identity Account
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create corporate identity credentials and assign system RBAC authorization roles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {modalError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">User Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rajesh Patil"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Corporate Email Address</Label>
              <Input
                type="email"
                value={corporateEmail}
                onChange={(e) => setCorporateEmail(e.target.value)}
                placeholder="e.g. rajesh.patil@avenuebuilders.in"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Assigned System Role</Label>
                <Select value={assignedRole} onValueChange={(val) => val && setAssignedRole(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="System Administrator">System Administrator</SelectItem>
                    <SelectItem value="Project Director">Project Director</SelectItem>
                    <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                    <SelectItem value="Procurement Lead">Procurement Lead</SelectItem>
                    <SelectItem value="Site Engineer">Site Engineer</SelectItem>
                    <SelectItem value="Sales Manager">Sales Manager</SelectItem>
                    <SelectItem value="Board Member">Board Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Department</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Finance & Treasury"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsProvisionOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs font-medium" onClick={handleProvisionUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Provisioning...
                </span>
              ) : (
                "Provision User Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RolePermissionsModal
        isOpen={isMatrixOpen}
        onClose={() => setIsMatrixOpen(false)}
        onPermissionsUpdated={loadData}
      />
    </div>
  );
}
