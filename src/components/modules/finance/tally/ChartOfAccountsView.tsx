"use client";

import React, { useState, useEffect } from "react";
import { tallyErpApi, TallyLedger } from "@/services/tallyErpApi";
import { BookScope } from "@/lib/accounting/multiBookScope";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { toast } from "@/components/ui/sonner";
import { BookOpen, Plus, Layers, Building2, Search } from "lucide-react";

interface ChartOfAccountsViewProps {
  bookScope?: BookScope;
}

export function ChartOfAccountsView({ bookScope = "STATUTORY" }: ChartOfAccountsViewProps) {
  const [ledgers, setLedgers] = useState<TallyLedger[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals State
  const [isCreateLedgerOpen, setIsCreateLedgerOpen] = useState<boolean>(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState<boolean>(false);
  const [isCreateCostCenterOpen, setIsCreateCostCenterOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New Ledger Form
  const [newLedgerName, setNewLedgerName] = useState<string>("");
  const [newLedgerGroup, setNewLedgerGroup] = useState<string>("GRP-100");
  const [newLedgerBalance, setNewLedgerBalance] = useState<string>("0");
  const [newLedgerType, setNewLedgerType] = useState<"Dr" | "Cr">("Dr");
  const [newLedgerBookType, setNewLedgerBookType] = useState<"STATUTORY" | "INTERNAL">("STATUTORY");
  const [newLedgerGstin, setNewLedgerGstin] = useState<string>("");
  const [newBankAccount, setNewBankAccount] = useState<string>("");
  const [newBankIfsc, setNewBankIfsc] = useState<string>("");
  const [newIsMsme, setNewIsMsme] = useState<boolean>(false);
  const [newMsmeCategory, setNewMsmeCategory] = useState<string>("MICRO");

  // New Group Form
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [newGroupNature, setNewGroupNature] = useState<string>("ASSET");

  // New Cost Center Form
  const [newCenterName, setNewCenterName] = useState<string>("");
  const [newCenterCategory, setNewCenterCategory] = useState<string>("PROJECT");

  const loadCoaData = async () => {
    setIsLoading(true);
    try {
      const res = await tallyErpApi.fetchChartOfAccounts(bookScope);
      setLedgers(res.data || []);
      setGroups(res.groups || []);
      setCostCenters(res.costCenters || []);
    } catch (err: any) {
      toast({ title: "Failed to load Chart of Accounts", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoaData();
  }, [bookScope]);

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedgerName.trim()) {
      toast({ title: "Validation Error", description: "Ledger name is required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await tallyErpApi.createLedger({
        name: newLedgerName,
        groupCode: newLedgerGroup,
        bookType: newLedgerBookType,
        balance: parseFloat(newLedgerBalance) || 0,
        type: newLedgerType,
        gstin: newLedgerGstin || undefined,
        bankAccountNumber: newBankAccount || undefined,
        bankIfscCode: newBankIfsc || undefined,
        isMsme: newIsMsme,
        msmeCategory: newIsMsme ? newMsmeCategory : undefined,
      });

      toast({ title: "Ledger Account Created", description: `Account '${newLedgerName}' registered successfully.` });
      setIsCreateLedgerOpen(false);
      setNewLedgerName("");
      setNewBankAccount("");
      setNewBankIfsc("");
      loadCoaData();
    } catch (err: any) {
      toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsSubmitting(true);
    try {
      await tallyErpApi.createGroup({ newGroupName, newGroupNature });
      toast({ title: "Account Group Created", description: `Group '${newGroupName}' created.` });
      setIsCreateGroupOpen(false);
      setNewGroupName("");
      loadCoaData();
    } catch (err: any) {
      toast({ title: "Group Creation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCenterName.trim()) return;

    setIsSubmitting(true);
    try {
      await tallyErpApi.createCostCenter({ centerName: newCenterName, centerCategory: newCenterCategory });
      toast({ title: "Cost Center Created", description: `Cost Center '${newCenterName}' added.` });
      setIsCreateCostCenterOpen(false);
      setNewCenterName("");
      loadCoaData();
    } catch (err: any) {
      toast({ title: "Cost Center Creation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLedgers = ledgers.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Master Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ledgers or groups..."
            className="pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button size="sm" variant="outline" onClick={() => setIsCreateGroupOpen(true)} className="gap-1 text-xs">
            <Layers className="h-3.5 w-3.5" /> Add Group
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsCreateCostCenterOpen(true)} className="gap-1 text-xs">
            <Building2 className="h-3.5 w-3.5" /> Add Cost Center
          </Button>
          <Button size="sm" onClick={() => setIsCreateLedgerOpen(true)} className="gap-1 text-xs font-bold">
            <Plus className="h-3.5 w-3.5" /> Create Ledger
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Groups Hierarchy */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Account Groups Tree</CardTitle>
            <CardDescription>Primary & Sub-group structural classification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Accordion defaultValue={["grp-assets", "grp-liabilities", "grp-income", "grp-expenses"]}>
              <AccordionItem value="grp-assets">
                <AccordionTrigger className="text-xs font-bold">1000 - Assets Pool</AccordionTrigger>
                <AccordionContent>
                  <div className="pl-3 space-y-1 py-1 text-xs text-muted-foreground">
                    {groups
                      .filter((g) => g.nature === "ASSET")
                      .map((g) => (
                        <div key={g.id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/40">
                          <span>{g.groupName}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">ASSET</Badge>
                        </div>
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="grp-liabilities">
                <AccordionTrigger className="text-xs font-bold">2000 - Liabilities & Capital</AccordionTrigger>
                <AccordionContent>
                  <div className="pl-3 space-y-1 py-1 text-xs text-muted-foreground">
                    {groups
                      .filter((g) => g.nature === "LIABILITY")
                      .map((g) => (
                        <div key={g.id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/40">
                          <span>{g.groupName}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">LIABILITY</Badge>
                        </div>
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="grp-income">
                <AccordionTrigger className="text-xs font-bold">3000 - Revenue & Income</AccordionTrigger>
                <AccordionContent>
                  <div className="pl-3 space-y-1 py-1 text-xs text-muted-foreground">
                    {groups
                      .filter((g) => g.nature === "INCOME")
                      .map((g) => (
                        <div key={g.id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/40">
                          <span>{g.groupName}</span>
                          <Badge variant="outline" className="text-[10px] font-mono text-emerald-600">INCOME</Badge>
                        </div>
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="grp-expenses">
                <AccordionTrigger className="text-xs font-bold">4000 - Direct & Indirect Expenses</AccordionTrigger>
                <AccordionContent>
                  <div className="pl-3 space-y-1 py-1 text-xs text-muted-foreground">
                    {groups
                      .filter((g) => g.nature === "EXPENSE")
                      .map((g) => (
                        <div key={g.id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/40">
                          <span>{g.groupName}</span>
                          <Badge variant="outline" className="text-[10px] font-mono text-rose-600">EXPENSE</Badge>
                        </div>
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Master General Ledger Directory */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Ledger Accounts Master</CardTitle>
              <CardDescription>Live account records, nature, and closing balances</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {filteredLedgers.length} Accounts
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLedgers.length === 0 ? (
              <div className="p-6">
                <CorporateEmptyState
                  icon={BookOpen}
                  title="No Ledger Accounts Found"
                  description="Create your first Chart of Accounts ledger or adjust your search filter."
                  actionLabel="Create Ledger Account"
                  onAction={() => setIsCreateLedgerOpen(true)}
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Ledger Name</TableHead>
                    <TableHead>Parent Group</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Bank / Tax Info</TableHead>
                    <TableHead className="text-right">Closing Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedgers.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs font-semibold">{l.code}</TableCell>
                      <TableCell className="text-xs font-medium">
                        <div>
                          <span>{l.name}</span>
                          {l.isMsme && (
                            <Badge variant="outline" className="ml-2 text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                              MSME ({l.msmeCategory || "MICRO"})
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {l.group}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            l.bookType === "INTERNAL"
                              ? "bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]"
                              : "bg-primary/10 text-primary border-primary/20 text-[10px]"
                          }
                        >
                          {l.bookType || "STATUTORY"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {l.bankAccountNumber
                          ? `A/c: ${l.bankAccountNumber} (${l.bankIfscCode})`
                          : l.gstin || l.pan || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-right">
                        ₹{Number(l.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })} {l.type}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Ledger Account Dialog */}
      <Dialog open={isCreateLedgerOpen} onOpenChange={setIsCreateLedgerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Ledger Account</DialogTitle>
            <DialogDescription>Add a new account into the Chart of Accounts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLedger} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Ledger Name</label>
              <Input
                value={newLedgerName}
                onChange={(e) => setNewLedgerName(e.target.value)}
                placeholder="e.g. State Bank of India Corporate A/c"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Account Group</label>
                <select
                  value={newLedgerGroup}
                  onChange={(e) => setNewLedgerGroup(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="GRP-100">Bank & Cash Accounts</option>
                  <option value="GRP-200">Sundry Debtors (Receivables)</option>
                  <option value="GRP-210">Inventory & Stock Assets</option>
                  <option value="GRP-300">Sundry Creditors (Payables)</option>
                  <option value="GRP-400">Duties & Taxes (GST/TDS)</option>
                  <option value="GRP-500">Sales & Revenue</option>
                  <option value="GRP-600">Direct Project Expenses</option>
                  <option value="GRP-610">Indirect Expenses</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Book Scope</label>
                <select
                  value={newLedgerBookType}
                  onChange={(e) => setNewLedgerBookType(e.target.value as "STATUTORY" | "INTERNAL")}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold"
                >
                  <option value="STATUTORY">Statutory (System 1)</option>
                  <option value="INTERNAL">Internal Cash (System 0)</option>
                </select>
              </div>
            </div>

            {/* Bank Details */}
            {newLedgerGroup === "GRP-100" && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary">Bank Account Number</label>
                  <Input
                    value={newBankAccount}
                    onChange={(e) => setNewBankAccount(e.target.value)}
                    placeholder="50200012345678"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary">IFSC Code</label>
                  <Input
                    value={newBankIfsc}
                    onChange={(e) => setNewBankIfsc(e.target.value)}
                    placeholder="HDFC0000123"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Opening Balance (₹)</label>
                <Input
                  type="number"
                  value={newLedgerBalance}
                  onChange={(e) => setNewLedgerBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Balance Nature (Dr/Cr)</label>
                <select
                  value={newLedgerType}
                  onChange={(e) => setNewLedgerType(e.target.value as "Dr" | "Cr")}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="Dr">Debit (Dr)</option>
                  <option value="Cr">Credit (Cr)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">GSTIN (Optional)</label>
                <Input
                  value={newLedgerGstin}
                  onChange={(e) => setNewLedgerGstin(e.target.value)}
                  placeholder="27AAAAA0000A1Z5"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="msme-chk"
                  checked={newIsMsme}
                  onChange={(e) => setNewIsMsme(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="msme-chk" className="text-xs font-semibold">
                  MSME Registered Vendor
                </label>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
              {isSubmitting ? "Creating..." : "Save Ledger Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Account Group</DialogTitle>
            <DialogDescription>Define a new grouping category in the Chart of Accounts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGroup} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Group Name</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Subcontractor Work in Progress"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Account Nature</label>
              <select
                value={newGroupNature}
                onChange={(e) => setNewGroupNature(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold"
              >
                <option value="ASSET">ASSET (Debit Normal)</option>
                <option value="LIABILITY">LIABILITY (Credit Normal)</option>
                <option value="INCOME">INCOME (Credit Normal)</option>
                <option value="EXPENSE">EXPENSE (Debit Normal)</option>
              </select>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
              {isSubmitting ? "Creating..." : "Save Account Group"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Cost Center Dialog */}
      <Dialog open={isCreateCostCenterOpen} onOpenChange={setIsCreateCostCenterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Cost Center</DialogTitle>
            <DialogDescription>Add a project, site, or branch cost center node.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCostCenter} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Cost Center Name</label>
              <Input
                value={newCenterName}
                onChange={(e) => setNewCenterName(e.target.value)}
                placeholder="e.g. Tower A Concrete Cost Center"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Category</label>
              <select
                value={newCenterCategory}
                onChange={(e) => setNewCenterCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
              >
                <option value="PROJECT">PROJECT (Real Estate Site)</option>
                <option value="BRANCH">BRANCH (Regional Office)</option>
                <option value="DEPARTMENT">DEPARTMENT (Corporate Operations)</option>
              </select>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
              {isSubmitting ? "Creating..." : "Save Cost Center"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
