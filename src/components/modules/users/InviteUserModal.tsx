"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2, Eye, EyeOff } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [department, setDepartment] = useState("Engineering & Site Operations");
  const [designation, setDesignation] = useState("Project Manager");
  const [role, setRole] = useState("Site Engineer");
  const [siteLocation, setSiteLocation] = useState("Nashik Corporate Office");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { values: departments } = useCatalogOptions("DEPARTMENT");
  const { values: siteLocations } = useCatalogOptions("SITE_LOCATION");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError("Full name and official corporate email are required.");
      return;
    }

    if (!initialPassword || initialPassword.length < 8) {
      setError("Initial password must be at least 8 characters long.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const user = await usersApi.inviteUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        initialPassword,
        department: department || "Operations",
        designation: designation.trim() || "Associate",
        role,
        siteLocation: siteLocation || "Nashik Corporate Office",
      });
      onSuccess(user);
      onClose();
      // Reset form
      setFullName("");
      setEmail("");
      setInitialPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Employee onboarding could not be completed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Onboard New Enterprise Employee
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create an enterprise employee profile, assign operational roles, and configure site credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          {error && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="employee-full-name" className="text-xs font-semibold">
              Employee Full Name
            </Label>
            <Input
              id="employee-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Patil"
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="employee-email" className="text-xs font-semibold">
              Official Corporate Email
            </Label>
            <Input
              id="employee-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@avenuebuilders.in"
              className="h-8 text-xs font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="employee-password" className="text-xs font-semibold">
              Initial Temporary Password
            </Label>
            <div className="relative">
              <Input
                id="employee-password"
                type={showPassword ? "text" : "password"}
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                placeholder="Min 8 characters (Letters & Numbers)"
                className="h-8 text-xs font-mono pr-8"
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Employee will be required to change their password on first sign-in.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="employee-department" className="text-xs font-semibold">
                Department
              </Label>
              <Select value={department} onValueChange={(val) => val && setDepartment(val)}>
                <SelectTrigger id="employee-department" className="h-8 text-xs">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                  {departments.length === 0 && (
                    <SelectItem value="Engineering & Site Operations">
                      Engineering & Site Operations
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="employee-role" className="text-xs font-semibold">
                System Role
              </Label>
              <Select value={role} onValueChange={(val) => val && setRole(val)}>
                <SelectTrigger id="employee-role" className="h-8 text-xs">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Site Engineer">Site Engineer</SelectItem>
                  <SelectItem value="Construction Manager">Construction Manager</SelectItem>
                  <SelectItem value="Procurement Manager">Procurement Manager</SelectItem>
                  <SelectItem value="Procurement Lead">Procurement Lead</SelectItem>
                  <SelectItem value="Facility Manager">Facility Manager</SelectItem>
                  <SelectItem value="Finance Lead">Finance Lead</SelectItem>
                  <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                  <SelectItem value="Accountant">Accountant</SelectItem>
                  <SelectItem value="Auditor">Auditor</SelectItem>
                  <SelectItem value="Legal Lead">Legal Lead</SelectItem>
                  <SelectItem value="Legal Counsel">Legal Counsel</SelectItem>
                  <SelectItem value="HR Manager">HR Manager</SelectItem>
                  <SelectItem value="HR Specialist">HR Specialist</SelectItem>
                  <SelectItem value="Sales Specialist">Sales Specialist</SelectItem>
                  <SelectItem value="Sales Manager">Sales Manager</SelectItem>
                  <SelectItem value="Governance Director">Governance Director</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="employee-designation" className="text-xs font-semibold">
              Position Title / Designation
            </Label>
            <Input
              id="employee-designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Senior Billing Engineer"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="employee-site-location" className="text-xs font-semibold">
              Primary Site Assignment
            </Label>
            <Select value={siteLocation} onValueChange={(val) => val && setSiteLocation(val)}>
              <SelectTrigger id="employee-site-location" className="h-8 text-xs">
                <SelectValue placeholder="Select Site Location" />
              </SelectTrigger>
              <SelectContent>
                {siteLocations.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
                {siteLocations.length === 0 && (
                  <SelectItem value="Nashik Corporate Office">
                    Nashik Corporate Office
                  </SelectItem>
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
