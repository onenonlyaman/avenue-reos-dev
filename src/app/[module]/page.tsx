import React from "react";
import { ModuleUnavailable } from "@/components/modules/ModuleUnavailable";

interface ModulePageProps {
  params: Promise<{
    module: string;
  }>;
}

export default async function ModulePage({ params }: ModulePageProps) {
  const resolvedParams = await params;
  const moduleSlug = resolvedParams.module;

  return <ModuleUnavailable moduleSlug={moduleSlug} moduleName={moduleSlug} />;
}
