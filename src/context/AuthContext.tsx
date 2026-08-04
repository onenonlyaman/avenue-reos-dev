"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi, UserProfile, AuthResponse } from "@/services/authApi";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {
    throw new Error("AuthContext not initialized");
  },
  logout: async () => {},
  hasRole: () => false,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await authApi.getMe();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await authApi.login(email, password);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  };

  const hasRole = (allowedRoles: string[]): boolean => {
    if (!user) return false;
    if (user.role === "Governance Director") return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
