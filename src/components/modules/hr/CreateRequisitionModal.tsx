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
import { hrApi, Candidate } from "@/services/hrApi";

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCandidate: Candidate) => void;
}

export function CreateRequisitionModal({ isOpen, onClose, onSuccess }: CreateRequisitionModalProps) {
  const [candidateName, setCandidateName] = useState("");
  const [targetPosition, setTargetPosition] = useState("Sr. Site Supervisor");
  const [experienceLevel, setExperienceLevel] = useState("Mid Level (3-5 yrs)");
  const [contactEmail, setContactEmail] = useState("");
  const [currentStage, setCurrentStage] = useState<any>("Applied");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName || !targetPosition) {
      setError("Candidate name and target position are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await hrApi.createCandidate({
        candidateName,
        targetPosition,
        experienceLevel,
        contactEmail,
        currentStage,
      });
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Job requisition record could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Create Job Requisition / Applicant Record
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Candidate Full Name</Label>
            <Input
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="e.g. Aniket Deshmukh"
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Position</Label>
              <Input
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
                placeholder="e.g. Sr. Site Supervisor"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Experience Level</Label>
              <Select value={experienceLevel} onValueChange={(val) => val && setExperienceLevel(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Junior (1-3 yrs)">Junior (1-3 yrs)</SelectItem>
                  <SelectItem value="Mid Level (3-5 yrs)">Mid Level (3-5 yrs)</SelectItem>
                  <SelectItem value="Senior (5-8 yrs)">Senior (5-8 yrs)</SelectItem>
                  <SelectItem value="Lead / Executive (8+ yrs)">Lead / Executive (8+ yrs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact Email</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="aniket@example.com"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pipeline Stage</Label>
              <Select value={currentStage} onValueChange={(val) => val && setCurrentStage(val as any)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Applied">Applied</SelectItem>
                  <SelectItem value="Screening">Screening</SelectItem>
                  <SelectItem value="Technical Interview">Technical Interview</SelectItem>
                  <SelectItem value="Site Assessment">Site Assessment</SelectItem>
                  <SelectItem value="Offer Issued">Offer Issued</SelectItem>
                </SelectContent>
              </Select>
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
                "Create Candidate Record"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
