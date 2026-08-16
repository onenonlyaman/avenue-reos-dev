"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CorporateStatCard } from "@/components/core/CorporateStatCard";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { Users, HardHat, Building2, UserMinus, PlusCircle, AlertCircle, Loader2, Search, Filter } from "lucide-react";
import { hrApi, Employee } from "@/services/hrApi";
import { AddEmployeeModal } from "./AddEmployeeModal";

export function EmployeeDirectoryView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await hrApi.getEmployees();
      setEmployees(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Workforce directory could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val?: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      emp.fullName.toLowerCase().includes(q) ||
      emp.designation.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      emp.siteLocation.toLowerCase().includes(q) ||
      emp.corporateEmail.toLowerCase().includes(q) ||
      emp.contactNumber.includes(q);

    const matchesDept = selectedDepartment === "ALL" || emp.department === selectedDepartment;

    return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const siteLaborCount = employees.filter((e) => e.workforceType === "Daily Wage" || e.workforceType === "Contract").length;
  const officeStaffCount = employees.filter((e) => e.workforceType === "Permanent").length;
  const noticePeriodCount = employees.filter((e) => e.status === "NOTICE_PERIOD").length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading corporate workforce directory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Workforce Service Error"
        description={error}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Enterprise Workforce & Site Labor Directory
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active personnel records, site allocations, and baseline statutory salary compensation.
          </p>
        </div>

        <Button size="sm" className="gap-1.5 text-xs font-semibold shrink-0" onClick={() => setIsModalOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Add Employee Record
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CorporateStatCard
          label="Total Active Headcount"
          value={employees.length.toString()}
          subtext="Verified Nashik Roster"
          icon={Users}
          trend={`${officeStaffCount} Permanent, ${siteLaborCount} Contract/Site`}
          trendDirection="up"
        />

        <CorporateStatCard
          label="Site Labor Strength"
          value={siteLaborCount.toString()}
          subtext="Daily Wage & Contract"
          icon={HardHat}
          trend="Active Site Deployment"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Permanent Corporate Staff"
          value={officeStaffCount.toString()}
          subtext="HQ & Management"
          icon={Building2}
          trend="Full-Time Employment"
          trendDirection="neutral"
        />

        <CorporateStatCard
          label="Pending Exit Clearances"
          value={noticePeriodCount.toString()}
          subtext="Notice Period Active"
          icon={UserMinus}
          trend="Offboarding Queue"
          trendDirection="down"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-lg border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, role, site, or email..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        {departments.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="h-8 text-xs bg-background border border-border rounded px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Departments ({employees.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredEmployees.length === 0 ? (
        <CorporateEmptyState
          title={employees.length === 0 ? "No Employee Records Found" : "No Matching Employees"}
          description={
            employees.length === 0
              ? "The workforce directory is currently empty. Provision new employee records to initialize site labor rosters and corporate staff tracking."
              : "No employee records matched your filter criteria."
          }
          actionLabel="Add Employee Record"
          onAction={() => setIsModalOpen(true)}
          icon={Users}
        />
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Employee Name</TableHead>
                  <TableHead className="text-xs font-semibold">Designation & Department</TableHead>
                  <TableHead className="text-xs font-semibold">Assigned Site / Location</TableHead>
                  <TableHead className="text-xs font-semibold">Workforce Category</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Basic + Allowances</TableHead>
                  <TableHead className="text-xs font-semibold">Joining Date</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs py-3 font-semibold text-foreground">
                      <div>{emp.fullName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {emp.corporateEmail || emp.contactNumber || "Contact not on file"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <div className="font-medium text-foreground">{emp.designation}</div>
                      <div className="text-[10px] text-muted-foreground">{emp.department}</div>
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium text-foreground">
                      {emp.siteLocation}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <Badge variant="outline" className="text-[10px] font-medium border-border">
                        {emp.workforceType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-mono font-bold text-foreground">
                      {formatCurrency(emp.basicSalary)}
                      <span className="text-[10px] text-muted-foreground font-normal block">
                        + {formatCurrency(emp.allowances)} allow.
                      </span>
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono text-muted-foreground">
                      {emp.joiningDate}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      {emp.status === "ACTIVE" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          ACTIVE
                        </Badge>
                      ) : emp.status === "ON_LEAVE" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-blue-100 text-blue-800 border-blue-300">
                          ON LEAVE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-900 border-amber-300">
                          NOTICE PERIOD
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newEmp) => setEmployees((prev) => [newEmp, ...prev])}
      />
    </div>
  );
}
