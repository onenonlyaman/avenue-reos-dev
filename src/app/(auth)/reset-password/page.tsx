"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Please fill out both password fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Password could not be completed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold font-heading text-foreground">
            Set New Password
          </h1>
        </div>

        {isSuccess ? (
          <div className="text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-700 mx-auto" />
            <p className="text-xs text-muted-foreground">
              Your password has been successfully updated. You can now sign in with your new credentials.
            </p>
            <Button size="sm" className="w-full text-xs font-semibold mt-2" onClick={() => router.push("/login")}>
              Proceed to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">New Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-9 text-xs font-mono"
              />
            </div>

            <Button type="submit" className="w-full h-9 text-xs font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Corporate Password"
              )}
            </Button>
          </form>
        )}

        <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Cancel and Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
