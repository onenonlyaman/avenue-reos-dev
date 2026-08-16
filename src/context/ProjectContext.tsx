"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export interface ProjectSummary {
  id: string;
  projectCode: string;
  projectName: string;
  location: string;
  totalAreaSqft: number;
  totalBudget: number;
  status: string;
  towers: string[];
}

interface ProjectContextValue {
  projects: ProjectSummary[];
  selectedProjectId: string | null; // null represents "All Projects / Portfolio View"
  selectedProject: ProjectSummary | null;
  isLoading: boolean;
  error: string | null;
  setSelectedProjectId: (id: string | null) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY = "avenue_reos_active_project_id";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/v1/projects");
      if (!res.ok) {
        throw new Error(`Failed to load projects (${res.status})`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProjects(json.data);
      } else {
        setProjects([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching project directory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Hydrate from localStorage and fetch projects
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setSelectedProjectIdState(stored === "ALL" ? null : stored);
      }
    } catch {
      // Storage access restricted in some iframes/modes
    }
    refreshProjects();
  }, [refreshProjects]);

  const setSelectedProjectId = useCallback((id: string | null) => {
    setSelectedProjectIdState(id);
    try {
      if (id === null) {
        localStorage.setItem(LOCAL_STORAGE_KEY, "ALL");
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, id);
      }
    } catch {
      // Storage access restricted
    }
  }, []);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const value = useMemo(
    () => ({
      projects,
      selectedProjectId,
      selectedProject,
      isLoading,
      error,
      setSelectedProjectId,
      refreshProjects,
    }),
    [projects, selectedProjectId, selectedProject, isLoading, error, setSelectedProjectId, refreshProjects]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
