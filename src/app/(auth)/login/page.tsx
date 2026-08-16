"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectUrl =
    rawRedirect &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.startsWith("/\\")
      ? rawRedirect
      : "/";

  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email address and password");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await login(email, password);
      router.push(redirectUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to authenticate");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold font-heading text-foreground">
          REOS Executive Portal
        </h1>
      </div>

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

        <fieldset disabled={isLoading} className="space-y-4 disabled:opacity-80">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs font-semibold">
              Corporate Email Address
            </Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@avenuebuilders.in"
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-xs font-semibold">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-primary hover:underline"
                tabIndex={isLoading ? -1 : 0}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-9 text-xs font-mono pr-8"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-9 text-xs font-semibold" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              "Sign In to Executive Portal"
            )}
          </Button>
        </fieldset>
      </form>

      <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Encrypted Session</span>
        </div>
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Request Onboarding
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-primary" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
