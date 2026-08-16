import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/context/AuthContext";
import { RouteAuthorisation } from "@/components/layout/RouteAuthorisation";

const geistHeading = Geist({ subsets: ["latin"], variable: "--font-heading" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { SESSION_COOKIE_NAME } from "@/lib/config";
import { resolveSession } from "@/lib/session";
import type { UserProfile } from "@/services/authApi";

export const metadata: Metadata = {
  title: "REOS - REOS",
  description: "Enterprise operating platform for developers, builders, contractors, finance teams, and executive management.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const defaultSidebarOpen = sidebarCookie === undefined ? true : sidebarCookie === "true";

  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  let initialUser: UserProfile | null = null;
  if (sessionToken) {
    try {
      const session = await resolveSession(sessionToken);
      if (session) {
        initialUser = {
          id: session.user.id,
          fullName: session.user.fullName,
          email: session.user.email,
          department: session.user.department,
          designation: session.user.designation,
          siteLocation: session.user.siteLocation,
          mfaEnabled: Boolean(session.user.mfaEnabled),
          status: session.user.status as "ACTIVE" | "PENDING_APPROVAL" | "SUSPENDED",
          role: session.user.role,
          lastActive: session.user.lastActive,
        };
      }
    } catch {
      // Ignore session resolution errors on layout render
    }
  }

  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable, geistHeading.variable)}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider initialUser={initialUser}>
          <TooltipProvider>
            <AppShell defaultSidebarOpen={defaultSidebarOpen}>
              <RouteAuthorisation>{children}</RouteAuthorisation>
            </AppShell>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
