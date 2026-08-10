"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, CheckCircle2, Loader2 } from "lucide-react";
import { authApi } from "@/services/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email address is required");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await authApi.requestPasswordReset(email);
      setIsSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Password reset could not be completed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold font-heading text-foreground">
            Account Recovery
          </h1>
        </div>

        {isSent ? (
          <div className="text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-700 mx-auto" />
            <p className="text-xs text-muted-foreground">
              If <span className="font-bold text-foreground">{email}</span> belongs to an active
              account, a reset token has been issued. Your administrator will provide the reset
              link — this platform does not send email directly.
            </p>
            <Link href="/login">
              <Button size="sm" className="w-full text-xs font-semibold mt-2">
                Return to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-red-50 text-red-900 border border-red-200 rounded">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Corporate Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@avenuebuilders.in"
                className="h-9 text-xs"
              />
            </div>

            <Button type="submit" className="w-full h-9 text-xs font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Recovery Link...
                </>
              ) : (
                "Send Password Reset Link"
              )}
            </Button>
          </form>
        )}

        <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
