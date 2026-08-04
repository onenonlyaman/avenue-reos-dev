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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { communicationsApi, ChatChannel } from "@/services/communicationsApi";
import { useCatalogOptions } from "@/hooks/useCatalogOptions";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newChannel: ChatChannel) => void;
}

export function CreateChannelModal({ isOpen, onClose, onSuccess }: CreateChannelModalProps) {
  const [channelName, setChannelName] = useState("");
  const { values: departments } = useCatalogOptions("DEPARTMENT");
  const [department, setDepartment] = useState("Site Operations");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName) {
      setError("Channel name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await communicationsApi.createChannel({
        channelName,
        department,
        description,
        isPrivate,
      });
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Channel could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Create Workplace Communication Channel
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Channel Title</Label>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="e.g. Gangapur Site Engineers"
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Department Scope</Label>
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
            <Label className="text-xs font-semibold">Channel Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary coordination channel for site safety, concrete pours, and structural approvals."
              className="text-xs min-h-[80px]"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded">
            <div>
              <Label className="text-xs font-semibold">Private Channel Access</Label>
              <p className="text-[11px] text-muted-foreground">Restrict access to designated department officers only</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Channel"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
