"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Key,
  Laptop,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Clock,
  MapPin,
  Mail,
  Building,
  UserCheck,
} from "lucide-react";
import { authApi, UserProfile } from "@/services/authApi";
import { usersApi, UserSessionDevice } from "@/services/usersApi";
import { useAuth } from "@/context/AuthContext";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recently";
    const now = Date.now();
    const diffSeconds = Math.floor((now - date.getTime()) / 1000);

    if (diffSeconds < 45) return "Active just now";
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Recently";
  }
}

export function UserProfileView() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<UserSessionDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

  // Session revocation state
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [sessionActionMessage, setSessionActionMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setPageError(null);
      setSessionWarning(null);

      const [profileResult, sessionsResult] = await Promise.allSettled([
        authApi.getMe(),
        usersApi.getActiveSessions(),
      ]);

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value);
      } else {
        const err = profileResult.reason;
        throw new Error(err instanceof Error ? err.message : "User profile could not be loaded");
      }

      if (sessionsResult.status === "fulfilled") {
        setSessions(sessionsResult.value);
      } else {
        console.warn("[profile] active sessions load failed", sessionsResult.reason);
        setSessionWarning("Active session device register is currently synchronizing.");
      }
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : "User profile could not be loaded");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Password criteria computation
  const passwordCriteria = {
    minLength: newPassword.length >= 10,
    hasCase: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSymbol: /[^A-Za-z0-9]/.test(newPassword),
    matches: newPassword.length > 0 && newPassword === confirmPassword,
  };

  const isPasswordFormValid =
    currentPassword.length > 0 &&
    passwordCriteria.minLength &&
    passwordCriteria.hasCase &&
    passwordCriteria.hasNumber &&
    passwordCriteria.hasSymbol &&
    passwordCriteria.matches;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordFormValid || isUpdatingPassword) return;

    try {
      setIsUpdatingPassword(true);
      setPasswordSuccessMessage(null);
      setPasswordErrorMessage(null);

      const response = await authApi.changePassword(currentPassword, newPassword);

      setPasswordSuccessMessage(response.message || "Corporate password successfully updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Refresh active sessions list after password change (other sessions are revoked)
      const devices = await usersApi.getActiveSessions().catch(() => []);
      if (devices.length > 0) setSessions(devices);
      await refreshUser().catch(() => {});
    } catch (err: unknown) {
      setPasswordErrorMessage(
        err instanceof Error ? err.message : "Password update could not be completed. Please check your credentials."
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeSingleSession = async (sessionId: string) => {
    try {
      setRevokingSessionId(sessionId);
      setSessionActionMessage(null);
      await usersApi.revokeSession(sessionId);
      const devices = await usersApi.getActiveSessions();
      setSessions(devices);
      setSessionActionMessage("Device session successfully terminated.");
    } catch (err: unknown) {
      setSessionActionMessage(
        err instanceof Error ? err.message : "Device revocation could not be completed."
      );
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      setIsRevokingAll(true);
      setSessionActionMessage(null);
      await usersApi.revokeAllSessions();
      const devices = await usersApi.getActiveSessions();
      setSessions(devices);
      setIsRevokeDialogOpen(false);
      setSessionActionMessage("All other active device sessions have been terminated.");
    } catch (err: unknown) {
      setSessionActionMessage(
        err instanceof Error ? err.message : "Device revocation could not be completed."
      );
    } finally {
      setIsRevokingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-3 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="font-medium">Loading security profile & active sessions...</span>
      </div>
    );
  }

  if (pageError || !profile) {
    return (
      <CorporateEmptyState
        title="Profile Unreachable"
        description={pageError || "Could not retrieve user identity"}
        actionLabel="Retry Connection"
        onAction={loadData}
        icon={AlertCircle}
      />
    );
  }

  const initials = profile.fullName
    ? profile.fullName
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const otherSessionsCount = sessions.filter((s) => !s.isCurrentDevice).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identity Overview */}
        <div className="border border-border rounded-lg p-5 bg-card shadow-xs space-y-5 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3.5 pb-4 border-b border-border">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base font-heading shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{profile.fullName}</h3>
                <p className="text-xs text-muted-foreground truncate">{profile.designation}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-semibold uppercase px-1.5 py-0 ${
                      profile.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }`}
                  >
                    {profile.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-[10px] text-muted-foreground font-mono truncate">{profile.role}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" /> Department
                </span>
                <span className="font-semibold text-foreground">{profile.department}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Corporate Email
                </span>
                <span className="font-semibold text-foreground font-mono truncate max-w-[180px]" title={profile.email}>
                  {profile.email}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Site Location
                </span>
                <span className="font-semibold text-foreground">{profile.siteLocation}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" /> System Role
                </span>
                <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                  {profile.role}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  {profile.mfaEnabled ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  MFA Enforcement
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    profile.mfaEnabled
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }`}
                >
                  {profile.mfaEnabled ? "ENFORCED" : "OPTIONAL"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Last activity: {profile.lastActive ? new Date(profile.lastActive).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Active"}
            </span>
          </div>
        </div>

        {/* Right Column: Password & Session Management */}
        <div className="space-y-6 lg:col-span-2">
          {/* Password & Security Card */}
          <div className="border border-border rounded-lg p-5 bg-card shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Key className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold text-foreground">Password & Identity Controls</h4>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordSuccessMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-3 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{passwordSuccessMessage}</span>
                </div>
              )}

              {passwordErrorMessage && (
                <div
                  role="alert"
                  className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordErrorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-xs font-semibold">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="h-8 text-xs font-mono pr-9"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-semibold">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 10 characters"
                      className="h-8 text-xs font-mono pr-9"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="h-8 text-xs font-mono pr-9"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Password strength and policy checklist */}
              {newPassword.length > 0 && (
                <div className="p-3 bg-muted/30 border border-border rounded-md text-[11px] space-y-1.5">
                  <div className="font-semibold text-foreground text-[10px] uppercase tracking-wider">
                    Corporate Password Security Standards
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-muted-foreground">
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.minLength ? "text-emerald-600 font-medium" : ""}`}>
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>10+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasCase ? "text-emerald-600 font-medium" : ""}`}>
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>Upper & lower case</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? "text-emerald-600 font-medium" : ""}`}>
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>At least 1 digit</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasSymbol ? "text-emerald-600 font-medium" : ""}`}>
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>Special symbol</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.matches ? "text-emerald-600 font-medium" : ""}`}>
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>Passwords match</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5"
                  disabled={isUpdatingPassword || !isPasswordFormValid}
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Active Sessions Card */}
          <div className="border border-border rounded-lg p-5 bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground">Active Session Devices</h4>
              </div>

              {otherSessionsCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                  onClick={() => setIsRevokeDialogOpen(true)}
                  disabled={isRevokingAll}
                >
                  {isRevokingAll ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Revoke Other Sessions ({otherSessionsCount})
                </Button>
              )}
            </div>

            {sessionWarning && (
              <div className="p-2.5 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{sessionWarning}</span>
              </div>
            )}

            {sessionActionMessage && (
              <div
                role="status"
                className="p-2.5 text-xs bg-muted border border-border rounded flex items-center justify-between gap-2"
              >
                <span>{sessionActionMessage}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px]"
                  onClick={() => setSessionActionMessage(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}

            <div className="space-y-2.5">
              {sessions.length === 0 && (
                <CorporateEmptyState
                  title="No Active Devices Recorded"
                  description="Signed-in workstations and site devices appear here once identity sessions are registered."
                  icon={Laptop}
                />
              )}

              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3.5 bg-muted/20 border border-border rounded-md text-xs hover:border-border/80 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <span>{s.deviceName}</span>
                      {s.isCurrentDevice && (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        >
                          THIS DEVICE
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2">
                      <span>IP: {s.ipAddress}</span>
                      <span>•</span>
                      <span title={new Date(s.lastActiveTimestamp).toLocaleString()}>
                        {formatRelativeTime(s.lastActiveTimestamp)}
                      </span>
                    </div>
                  </div>

                  {!s.isCurrentDevice && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                      onClick={() => handleRevokeSingleSession(s.id)}
                      disabled={revokingSessionId === s.id}
                    >
                      {revokingSessionId === s.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <LogOut className="h-3 w-3" />
                      )}
                      <span>Terminate</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Revoking All Other Sessions */}
      <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Terminate Other Active Sessions?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              This action will immediately invalidate all {otherSessionsCount} other active sessions across
              workstations, laptops, and mobile devices logged into this account. You will remain logged in on this
              current device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setIsRevokeDialogOpen(false)}
              disabled={isRevokingAll}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5"
              onClick={handleRevokeAllOtherSessions}
              disabled={isRevokingAll}
            >
              {isRevokingAll ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Terminating Sessions...
                </>
              ) : (
                "Terminate All Other Sessions"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
