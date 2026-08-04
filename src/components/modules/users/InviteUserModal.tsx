"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { usersApi } from "@/services/usersApi";
import { UserProfile } from "@/services/authApi";
import { useCatalogOptions } from "@/hooks/useCatalogOptions";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
  const [fullName, setFullName] = useState("");
  const { values: departments } = useCatalogOptions("DEPARTMENT");
  const { values: siteLocations } = useCatalogOptions("SITE_LOCATION");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Engineering & Site Operations");
  const [designation, setDesignation] = useState("Project Manager");
  const [role, setRole] = useState("Site Engineer");
  const [siteLocation, setSiteLocation] = useState("Gangapur Road Developments");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      setError("Full name and official email are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const user = await usersApi.inviteUser({
        fullName,
        email,
        department,
        designation,
        role,
        siteLocation,
      });
      onSuccess(user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "New employee user could not be completed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Onboard New Enterprise Employee
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Employee Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Patil"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Official Corporate Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@avenuebuilders.in"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Department</Label>
              <Select value={department} onValueChange={(val) => val && setDepartment(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                  {departments.length === 0 && (
                    <div className="px-2 py-3 text-[11px] text-muted-foreground">No entries configured.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">System Role</Label>
              <Select value={role} onValueChange={(val) => val && setRole(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Site Engineer">Site Engineer</SelectItem>
                  <SelectItem value="Finance Lead">Finance Lead</SelectItem>
                  <SelectItem value="Legal Counsel">Legal Counsel</SelectItem>
                  <SelectItem value="Procurement Manager">Procurement Manager</SelectItem>
                  <SelectItem value="HR Specialist">HR Specialist</SelectItem>
                  <SelectItem value="Governance Director">Governance Director</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Position Title / Designation</Label>
            <Input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Senior Billing Engineer"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Primary Site Assignment</Label>
            <Select value={siteLocation} onValueChange={(val) => val && setSiteLocation(val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {siteLocations.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
                {siteLocations.length === 0 && (
                  <div className="px-2 py-3 text-[11px] text-muted-foreground">No entries configured.</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Inviting...
                </>
              ) : (
                "Send Employee Invitation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
