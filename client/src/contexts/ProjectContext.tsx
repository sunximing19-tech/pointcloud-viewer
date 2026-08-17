/**
 * ProjectContext
 * Per-project state for point cloud files and SpatialLM semantic analysis.
 * Design: Dark Universe - project data remains isolated when switching projects.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { PointCloud } from '@/lib/pointCloudParser';
import type { SpatialLMResult } from '@/lib/spatiallmClient';

export type SemanticStatus = 'idle' | 'running' | 'success' | 'error';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  cloud: PointCloud | null;
  fileName: string;
  sourceFile: File | null;
  semanticResult: SpatialLMResult | null;
  semanticStatus: SemanticStatus;
  semanticError: string;
}

interface ProjectContextState {
  projects: Project[];
  activeProjectId: string;
  activeProject: Project | null;

  createProject: (name?: string) => string;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  switchProject: (id: string) => void;
  updateProjectCloud: (id: string, cloud: PointCloud, fileName: string, sourceFile?: File) => void;
  setSemanticStatus: (id: string, status: SemanticStatus, error?: string) => void;
  setSemanticResult: (id: string, result: SpatialLMResult) => void;
  clearSemanticResult: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextState | null>(null);

let _idCounter = 0;
function genId() { return `proj-${++_idCounter}-${Date.now()}`; }

function makeProject(name: string): Project {
  return {
    id: genId(),
    name,
    createdAt: Date.now(),
    cloud: null,
    fileName: '',
    sourceFile: null,
    semanticResult: null,
    semanticStatus: 'idle',
    semanticError: '',
  };
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
      setActiveProjectId(cur => cur === id ? next[next.length - 1].id : cur);
      return next;
    });
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const switchProject = useCallback((id: string) => setActiveProjectId(id), []);

  const updateProjectCloud = useCallback((id: string, cloud: PointCloud, fileName: string, sourceFile?: File) => {
    setProjects(prev => prev.map(p => p.id === id ? {
      ...p,
      cloud,
      fileName,
      sourceFile: sourceFile ?? p.sourceFile,
      semanticResult: null,
      semanticStatus: 'idle',
      semanticError: '',
    } : p));
  }, []);

  const setSemanticStatus = useCallback((id: string, status: SemanticStatus, error = '') => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, semanticStatus: status, semanticError: error } : p));
  }, []);

  const setSemanticResult = useCallback((id: string, result: SpatialLMResult) => {
    setProjects(prev => prev.map(p => p.id === id ? {
      ...p,
      semanticResult: result,
      semanticStatus: 'success',
      semanticError: '',
    } : p));
  }, []);

  const clearSemanticResult = useCallback((id: string) => {
    setProjects(prev => prev.map(p => p.id === id ? {
      ...p,
      semanticResult: null,
      semanticStatus: 'idle',
      semanticError: '',
    } : p));
  }, []);

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProjectId,
      activeProject,
      createProject,
      deleteProject,
      renameProject,
      switchProject,
      updateProjectCloud,
      setSemanticStatus,
      setSemanticResult,
      clearSemanticResult,
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
