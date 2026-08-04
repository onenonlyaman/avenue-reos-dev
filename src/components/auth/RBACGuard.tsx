"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert } from "lucide-react";

interface RBACGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RBACGuard({ allowedRoles, children, fallback }: RBACGuardProps) {
  const { user, hasRole, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user || !hasRole(allowedRoles)) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    return (
      <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
        <span>Access Restricted: Action requires [{allowedRoles.join(", ")}] authorization.</span>
      </div>
    );
  }

  return <>{children}</>;
}
