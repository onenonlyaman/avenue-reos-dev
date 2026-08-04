"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Plus, Trash2, Loader2, ListChecks } from "lucide-react";

interface CatalogEntry {
  id: string;
  category: string;
  optionValue: string;
  sortOrder: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  DEPARTMENT: "Departments",
  UNIT_TYPOLOGY: "Unit Typologies",
  FACING_DIRECTION: "Facing Directions",
  PARKING_TYPE: "Parking Allocations",
  WORKFORCE_TYPE: "Workforce Types",
  SITE_LOCATION: "Site Locations",
  TICKET_CATEGORY: "Service Ticket Categories",
  ASSET_CATEGORY: "Facility Asset Categories",
  MATERIAL_CATEGORY: "Material Categories",
  LEAD_SOURCE: "Prospect Sources",
};

export function ReferenceListsView() {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [newCategory, setNewCategory] = useState("DEPARTMENT");
  const [newValue, setNewValue] = useState("");
  const [newSortOrder, setNewSortOrder] = useState("");

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/v1/settings/catalog");
      const envelope = await res.json();
      if (envelope.success && Array.isArray(envelope.data)) {
        setEntries(envelope.data);
      } else {
        setEntries([]);
        if (envelope.error) setError(envelope.error.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reference lists could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch("/api/v1/settings/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          optionValue: newValue.trim(),
          sortOrder: Number(newSortOrder) || 0,
        }),
      });
      const envelope = await res.json();
      if (!envelope.success) throw new Error(envelope.error?.message || "Reference entry could not be saved");
      setNewValue("");
      setNewSortOrder("");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reference entry could not be saved");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportFromRecords = async () => {
    try {
      setIsImporting(true);
      setError(null);
      const res = await fetch("/api/v1/settings/catalog/sync", { method: "POST" });
      const envelope = await res.json();
      if (!envelope.success) {
        throw new Error(envelope.error?.message || "Reference lists could not be imported from existing records");
      }
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reference lists could not be imported from existing records");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRetire = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/v1/settings/catalog?id=${id}`, { method: "DELETE" });
      const envelope = await res.json();
      if (!envelope.success) throw new Error(envelope.error?.message || "Reference entry could not be retired");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reference entry could not be retired");
    }
  };

  const grouped = Object.keys(CATEGORY_LABELS).map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: entries.filter((e) => e.category === category),
  }));

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-xs">
          {error}
        </div>
      )}

      <div className="border border-border rounded-lg bg-card p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">Add Reference Entry</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] font-medium"
            onClick={handleImportFromRecords}
            disabled={isImporting}
          >
            {isImporting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Import From Existing Records
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5 md:col-span-1">
            <Label className="text-xs font-medium">List</Label>
            <Select value={newCategory} onValueChange={(val) => val && setNewCategory(val)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select list" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-medium">Entry</Label>
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="e.g. Site Construction Operations"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Order</Label>
              <Input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button size="sm" className="h-8 text-xs w-full" onClick={handleAdd} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading reference lists...</span>
        </div>
      ) : entries.length === 0 ? (
        <CorporateEmptyState
          title="No Reference Entries Configured"
          description="Departments, typologies and other selection lists appear here once configured."
          icon={ListChecks}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {grouped
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.category} className="border border-border rounded-lg bg-card shadow-xs">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <h4 className="text-xs font-bold text-foreground">{group.label}</h4>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {group.items.length}
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Entry</TableHead>
                      <TableHead className="text-xs font-semibold w-20">Order</TableHead>
                      <TableHead className="text-xs font-semibold w-20 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs font-medium text-foreground">{item.optionValue}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{item.sortOrder}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-red-900 hover:bg-red-50"
                            onClick={() => handleRetire(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
