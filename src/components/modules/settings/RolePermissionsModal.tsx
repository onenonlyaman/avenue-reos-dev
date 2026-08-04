"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2 } from "lucide-react";
import { settingsApi, SystemRolePermission } from "@/services/settingsApi";

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated: () => void;
}

export function RolePermissionsModal({
  isOpen,
  onClose,
  onPermissionsUpdated,
}: RolePermissionsModalProps) {
  const [roles, setRoles] = useState<SystemRolePermission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await settingsApi.getRolePermissions();
      setRoles(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Role permissions could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const handleTogglePermission = async (role: SystemRolePermission, key: keyof SystemRolePermission) => {
    try {
      setSavingRole(role.roleName);
      const updated = { ...role, [key]: !role[key] };
      await settingsApi.updateRolePermission(updated);
      setRoles((prev) => prev.map((r) => (r.roleName === role.roleName ? updated : r)));
      onPermissionsUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Role permission could not be saved");
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl w-full p-6 bg-card text-card-foreground">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono">
              RBAC AUTHORIZATION MATRIX
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              FINE-GRAINED PRIVILEGES
            </span>
          </div>
          <DialogTitle className="text-base font-bold font-heading flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Configure Role Permission Vectors
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure Read, Create, Update, Delete, and HITL Authorization privileges across corporate system roles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs max-h-[420px] overflow-y-auto pr-1">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading system role permission vectors...
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((r) => (
                <div key={r.roleName} className="border border-border rounded-lg p-3 bg-card shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {r.roleName}
                    </span>
                    {savingRole === r.roleName && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-2 bg-muted/30 p-2.5 rounded border border-border text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Read</span>
                      <Switch
                        checked={r.canRead}
                        onCheckedChange={() => handleTogglePermission(r, "canRead")}
                        disabled={savingRole === r.roleName}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Create</span>
                      <Switch
                        checked={r.canCreate}
                        onCheckedChange={() => handleTogglePermission(r, "canCreate")}
                        disabled={savingRole === r.roleName}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Update</span>
                      <Switch
                        checked={r.canUpdate}
                        onCheckedChange={() => handleTogglePermission(r, "canUpdate")}
                        disabled={savingRole === r.roleName}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Delete</span>
                      <Switch
                        checked={r.canDelete}
                        onCheckedChange={() => handleTogglePermission(r, "canDelete")}
                        disabled={savingRole === r.roleName}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">HITL</span>
                      <Switch
                        checked={r.canAuthorizeHitl}
                        onCheckedChange={() => handleTogglePermission(r, "canAuthorizeHitl")}
                        disabled={savingRole === r.roleName}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Close Matrix Editor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
