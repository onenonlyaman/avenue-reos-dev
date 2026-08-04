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
import { hrApi, Employee } from "@/services/hrApi";
import { CatalogSelect } from "@/components/core/CatalogSelect";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEmployee: Employee) => void;
}

export function AddEmployeeModal({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) {
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("Site Construction Operations");
  const [siteLocation, setSiteLocation] = useState("Gangapur Road Site");
  const [workforceType, setWorkforceType] = useState<"Permanent" | "Contract" | "Daily Wage">("Permanent");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !designation) {
      setError("Full name and designation are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await hrApi.addEmployee({
        fullName,
        designation,
        department,
        siteLocation,
        workforceType,
        corporateEmail,
        contactNumber,
      });
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Employee record could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Add Workforce Record
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Designation</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Sr. Site Engineer"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Department</Label>
              <CatalogSelect
                category="DEPARTMENT"
                value={department}
                onValueChange={setDepartment}
                placeholder="Select department"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assigned Site / Branch</Label>
              <CatalogSelect
                category="SITE_LOCATION"
                value={siteLocation}
                onValueChange={setSiteLocation}
                placeholder="Select site"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Workforce Category</Label>
              <CatalogSelect
                category="WORKFORCE_TYPE"
                value={workforceType}
                onValueChange={(val) => setWorkforceType(val as any)}
                placeholder="Select category"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Corporate Email</Label>
              <Input
                type="email"
                value={corporateEmail}
                onChange={(e) => setCorporateEmail(e.target.value)}
                placeholder="r.patil@avenuebuilders.com"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact Mobile</Label>
              <Input
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+91 98220 12345"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Create Employee Record"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
