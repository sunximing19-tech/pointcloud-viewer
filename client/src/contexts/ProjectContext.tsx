/**
 * ProjectContext
 * Manages a list of "projects". Each project has its own PointCloud state.
 * Projects are stored in memory (no persistence).
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { PointCloud } from '@/lib/pointCloudParser';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  cloud: PointCloud | null;
  fileName: string;
}

interface ProjectContextState {
  projects: Project[];
  activeProjectId: string;
  activeProject: Project | null;

  createProject: (name?: string) => string;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  switchProject: (id: string) => void;
  updateProjectCloud: (id: string, cloud: PointCloud, fileName: string) => void;
}

const ProjectContext = createContext<ProjectContextState | null>(null);

let _idCounter = 0;
function genId() { return `proj-${++_idCounter}-${Date.now()}`; }

function makeProject(name: string): Project {
  return { id: genId(), name, createdAt: Date.now(), cloud: null, fileName: '' };
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const initialProject = useRef(makeProject('项目 1')).current;
  const [projects, setProjects] = useState<Project[]>([initialProject]);
  const [activeProjectId, setActiveProjectId] = useState<string>(initialProject.id);

  const activeProject = projects.find(p => p.id === activeProjectId) ?? null;

  const createProject = useCallback((name?: string) => {
    const proj = makeProject(name ?? `项目 ${projects.length + 1}`);
    setProjects(prev => [...prev, proj]);
    setActiveProjectId(proj.id);
    return proj.id;
  }, [projects.length]);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      if (next.length === 0) {
        const fallback = makeProject('项目 1');
        setActiveProjectId(fallback.id);
        return [fallback];
      }
      setActiveProjectId(cur => {
        if (cur === id) return next[next.length - 1].id;
        return cur;
      });
      return next;
    });
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const switchProject = useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  const updateProjectCloud = useCallback((id: string, cloud: PointCloud, fileName: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, cloud, fileName } : p));
  }, []);

  return (
    <ProjectContext.Provider value={{
      projects, activeProjectId, activeProject,
      createProject, deleteProject, renameProject, switchProject, updateProjectCloud,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
