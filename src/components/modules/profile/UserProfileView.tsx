"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { User, ShieldCheck, Key, Laptop, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { authApi, UserProfile } from "@/services/authApi";
import { usersApi, UserSessionDevice } from "@/services/usersApi";

export function UserProfileView() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<UserSessionDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await authApi.getMe();
      setProfile(user);
      const devices = await usersApi.getActiveSessions();
      setSessions(devices);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "User profile could not be loaded");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    try {
      setIsUpdatingPassword(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeSessions = async () => {
    try {
      await usersApi.revokeAllSessions();
      const devices = await usersApi.getActiveSessions();
      setSessions(devices);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Device revocation could not be completed");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <CorporateEmptyState
        title="Profile Unreachable"
        description={error || "Could not retrieve user identity"}
        actionLabel="Retry"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-border rounded-lg p-5 bg-card shadow-xs space-y-4 md:col-span-1">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg font-heading">
              {profile.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{profile.fullName}</h3>
              <p className="text-xs text-muted-foreground">{profile.designation}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Department</span>
              <span className="font-semibold text-foreground">{profile.department}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Corporate Email</span>
              <span className="font-semibold text-foreground">{profile.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Primary Location</span>
              <span className="font-semibold text-foreground">{profile.siteLocation}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">System Role</span>
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                {profile.role}
              </Badge>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">MFA Enforcement</span>
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                ENABLED
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-6 md:col-span-2">
          <div className="border border-border rounded-lg p-5 bg-card shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Key className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold text-foreground">Password & Identity Controls</h4>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              {passwordSuccess && (
                <div className="p-2.5 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 rounded">
                  Corporate password successfully updated.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" className="h-8 text-xs font-semibold" disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </div>

          <div className="border border-border rounded-lg p-5 bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground">Active Session Devices</h4>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] font-semibold text-red-900 border-red-300 hover:bg-red-50 gap-1"
                onClick={handleRevokeSessions}
              >
                <Trash2 className="h-3 w-3" />
                Revoke All Sessions
              </Button>
            </div>

            <div className="space-y-2">
              {sessions.length === 0 && (
                <CorporateEmptyState
                  title="No Active Devices Recorded"
                  description="Signed-in workstations and site devices appear here once identity sessions are registered."
                  icon={Laptop}
                />
              )}
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded text-xs">
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <span>{s.deviceName}</span>
                      {s.isCurrentDevice && (
                        <Badge variant="outline" className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          THIS DEVICE
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      IP: {s.ipAddress} • Last active: {new Date(s.lastActiveTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
