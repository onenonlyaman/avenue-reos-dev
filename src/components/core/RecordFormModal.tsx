"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CatalogSelect } from "@/components/core/CatalogSelect";
import { Loader2, Plus } from "lucide-react";

export type RecordFieldType = "text" | "number" | "date" | "textarea" | "select" | "catalog" | "checkbox";

export interface RecordFieldOption {
  value: string;
  label: string;
}

export interface RecordField {
  name: string;
  label: string;
  type: RecordFieldType;
  required?: boolean;
  placeholder?: string;
  options?: RecordFieldOption[];
  catalogCategory?: string;
  halfWidth?: boolean;
}

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  title: string;
  endpoint: string;
  fields: RecordField[];
  submitLabel: string;
  contextNote?: string;
  transform?: (values: Record<string, unknown>) => Record<string, unknown>;
}

export function RecordFormModal({
  isOpen,
  onClose,
  onSaved,
  title,
  endpoint,
  fields,
  submitLabel,
  contextNote,
  transform,
}: RecordFormModalProps) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValues({});
      setError(null);
    }
  }, [isOpen]);

  const setField = (name: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const missing = fields.filter((f) => f.required && !values[f.name]);
    if (missing.length > 0) {
      setError(`${missing[0].label} is required`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = transform ? transform(values) : values;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const envelope = await res.json();
      if (!envelope.success) throw new Error(envelope.error?.message || "Record could not be saved");

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Record could not be saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-6 bg-card text-card-foreground">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-bold font-heading flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          {contextNote ? (
            <DialogDescription className="text-xs text-muted-foreground">{contextNote}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => (
              <div
                key={field.name}
                className={field.halfWidth ? "space-y-1.5 col-span-1" : "space-y-1.5 col-span-2"}
              >
                {field.type !== "checkbox" && <Label className="text-xs font-medium">{field.label}</Label>}

                {field.type === "text" && (
                  <Input
                    value={(values[field.name] as string) || ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="h-8 text-xs"
                  />
                )}

                {field.type === "number" && (
                  <Input
                    type="number"
                    value={(values[field.name] as string) || ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="h-8 text-xs font-mono"
                  />
                )}

                {field.type === "date" && (
                  <Input
                    type="date"
                    value={(values[field.name] as string) || ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                )}

                {field.type === "textarea" && (
                  <Textarea
                    value={(values[field.name] as string) || ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="text-xs min-h-16"
                  />
                )}

                {field.type === "select" && (
                  <Select
                    value={(values[field.name] as string) || ""}
                    onValueChange={(val) => val && setField(field.name, val)}
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder={field.placeholder || "Select"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                      {(field.options || []).length === 0 && (
                        <div className="px-2 py-3 text-[11px] text-muted-foreground">No entries available.</div>
                      )}
                    </SelectContent>
                  </Select>
                )}

                {field.type === "catalog" && (
                  <CatalogSelect
                    category={field.catalogCategory || ""}
                    value={(values[field.name] as string) || ""}
                    onValueChange={(val) => setField(field.name, val)}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === "checkbox" && (
                  <label className="flex items-center gap-2 pt-5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.name])}
                      onChange={(e) => setField(field.name, e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    <span className="text-xs font-medium text-foreground">{field.label}</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs font-medium" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </span>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
