"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { authApi } from "@/services/authApi";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState("Engineering & Site Operations");
  const [designation, setDesignation] = useState("Project Manager");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      setError("Full name and official email address are required");
      return;
    }
    if (!password || !confirmPassword) {
      setError("Choose a password for the account");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await authApi.register({ fullName, email, password, department, designation });
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Onboarding request could not be saved");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xs p-6 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-700 mx-auto" />
          <h2 className="text-lg font-bold text-foreground">Onboarding Request Submitted</h2>
          <p className="text-xs text-muted-foreground">
            Your request has been routed to the HR & Governance Director approval queue. You will receive an activation email once authorized.
          </p>
          <Link href="/login">
            <Button size="sm" className="w-full text-xs font-semibold mt-2">
              Return to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold font-heading text-foreground">
            Employee Onboarding Portal
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Full Legal Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aman Bele"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Official Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@avenuebuilders.in"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="h-9 text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              At least 12 characters, with upper and lower case, a digit and a symbol.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Department</Label>
            <Select value={department} onValueChange={(val) => val && setDepartment(val)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Engineering & Site Operations">Engineering & Site Operations</SelectItem>
                <SelectItem value="Finance & Accounts">Finance & Accounts</SelectItem>
                <SelectItem value="Legal & Land Acquisition">Legal & Land Acquisition</SelectItem>
                <SelectItem value="Procurement & Materials">Procurement & Materials</SelectItem>
                <SelectItem value="CRM & Sales Operations">CRM & Sales Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Position Designation</Label>
            <Input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Lead Site Engineer"
              className="h-9 text-xs"
            />
          </div>

          <Button type="submit" className="w-full h-9 text-xs font-semibold" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Request...
              </>
            ) : (
              "Submit Onboarding Request"
            )}
          </Button>
        </form>

        <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground">
          <span>Already have an active account? </span>
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
