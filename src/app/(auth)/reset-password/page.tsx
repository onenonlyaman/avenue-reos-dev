"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";
import { authApi } from "@/services/authApi";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("This page needs the reset token from your reset link.");
      return;
    }
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
      await authApi.resetPassword(token, password);
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Password could not be updated");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold font-heading text-foreground">Set New Password</h1>
      </div>

      {isSuccess ? (
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <p className="text-xs text-muted-foreground">
            Your password has been updated and every existing session was signed out. Sign in with
            your new credentials.
          </p>
          <Button
            size="sm"
            className="w-full text-xs font-semibold mt-2"
            onClick={() => router.push("/login")}
          >
            Proceed to Sign In
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md font-medium"
            >
              {error}
            </div>
          )}

          {!token && (
            <div
              role="alert"
              className="p-3 text-xs bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20 rounded-md font-medium"
            >
              Open this page from the reset link supplied by your administrator. Without the token
              in the link no password can be changed.
            </div>
          )}

          <fieldset disabled={isLoading || !token} className="space-y-4 disabled:opacity-80">
            <div className="space-y-1.5">
              <Label htmlFor="reset-new-password" className="text-xs font-semibold">
                New Password
              </Label>
              <Input
                id="reset-new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-9 text-xs font-mono"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                At least 12 characters, with upper and lower case, a digit and a symbol.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm-password" className="text-xs font-semibold">
                Confirm New Password
              </Label>
              <Input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-9 text-xs font-semibold"
              disabled={isLoading || !token}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Corporate Password"
              )}
            </Button>
          </fieldset>
        </form>
      )}

      <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Cancel and Return to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-primary" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

