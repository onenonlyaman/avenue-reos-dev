"use client";

import React from "react";
import Link from "next/link";
import { Building2, ArrowLeft, ShieldAlert, Layers } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModuleUnavailableProps {
  moduleName?: string;
  moduleSlug?: string;
}

export function ModuleUnavailable({ moduleName = "Department Workspace", moduleSlug }: ModuleUnavailableProps) {
  const formattedName = moduleName.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-background min-h-[calc(100vh-4rem)]">
      <Card className="max-w-md w-full bg-card border-border shadow-sm text-card-foreground">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
              <Layers className="h-3 w-3 mr-1" />
              {moduleSlug || "department"}
            </Badge>
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground font-medium text-xs">
              Coming Soon
            </Badge>
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
            {formattedName} Workspace
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-1">
            This department workspace is currently being prepared for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 py-4 text-xs text-muted-foreground bg-muted/30 border-y border-border my-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>Contact your workspace administrator to enable this module.</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pt-2">
          <Link
            href="/"
            className={buttonVariants({ variant: "default", className: "w-full" })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
