/**
 * PointCloudContext
 * Global state for point cloud data, slices, and view settings.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { PointCloud, PointCloudSlice } from '@/lib/pointCloudParser';
import { splitPointCloud, projectPointCloud } from '@/lib/pointCloudParser';

export type SplitAxis = 'x' | 'y' | 'z';
export type ProjectionPlane = 'xy' | 'xz' | 'yz';
export type ViewMode = 'all' | 'single';

export interface ProjectionView {
  id: string;
  sliceIndex: number | 'all';
  plane: ProjectionPlane;
  cloud: PointCloud;
}

interface PointCloudState {
  // Raw data
  originalCloud: PointCloud | null;
  fileName: string;

  // Split settings
  splitAxis: SplitAxis;
  splitCount: number;
  slices: PointCloudSlice[];

  // View settings
  viewMode: ViewMode;
  activeSliceIndex: number;
  cameraLocked: boolean;
  pointSize: number;
  showGrid: boolean;
  showAxes: boolean;

  // Projection views
  projectionViews: ProjectionView[];

  // Actions
  loadCloud: (cloud: PointCloud, name: string) => void;
  setSplitAxis: (axis: SplitAxis) => void;
  setSplitCount: (n: number) => void;
  applySplit: () => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveSliceIndex: (idx: number) => void;
  setCameraLocked: (locked: boolean) => void;
  setPointSize: (size: number) => void;
  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  addProjectionView: (sliceIndex: number | 'all', plane: ProjectionPlane) => void;
  removeProjectionView: (id: string) => void;
  clearAll: () => void;
}

const PointCloudContext = createContext<PointCloudState | null>(null);

export function PointCloudProvider({ children }: { children: React.ReactNode }) {
  const [originalCloud, setOriginalCloud] = useState<PointCloud | null>(null);
  const [fileName, setFileName] = useState('');
  const [splitAxis, setSplitAxisState] = useState<SplitAxis>('z');
  const [splitCount, setSplitCountState] = useState(4);
  const [slices, setSlices] = useState<PointCloudSlice[]>([]);
  const [viewMode, setViewModeState] = useState<ViewMode>('all');
  const [activeSliceIndex, setActiveSliceIndexState] = useState(0);
  const [cameraLocked, setCameraLockedState] = useState(false);
  const [pointSize, setPointSizeState] = useState(2);
  const [showGrid, setShowGridState] = useState(true);
  const [showAxes, setShowAxesState] = useState(true);
  const [projectionViews, setProjectionViews] = useState<ProjectionView[]>([]);

  const projIdCounter = useRef(0);

  const loadCloud = useCallback((cloud: PointCloud, name: string) => {
    setOriginalCloud(cloud);
    setFileName(name);
    setSlices([]);
    setViewModeState('all');
    setActiveSliceIndexState(0);
    setProjectionViews([]);
  }, []);

  const setSplitAxis = useCallback((axis: SplitAxis) => {
    setSplitAxisState(axis);
  }, []);

  const setSplitCount = useCallback((n: number) => {
    setSplitCountState(Math.max(1, Math.min(50, n)));
  }, []);

  const applySplit = useCallback(() => {
    if (!originalCloud) return;
    const newSlices = splitPointCloud(originalCloud, splitAxis, splitCount);
    setSlices(newSlices);
    setViewModeState('all');
    setActiveSliceIndexState(0);
  }, [originalCloud, splitAxis, splitCount]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

  const setActiveSliceIndex = useCallback((idx: number) => {
    setActiveSliceIndexState(idx);
  }, []);

  const setCameraLocked = useCallback((locked: boolean) => {
    setCameraLockedState(locked);
  }, []);

  const setPointSize = useCallback((size: number) => {
    setPointSizeState(size);
  }, []);

  const setShowGrid = useCallback((show: boolean) => {
    setShowGridState(show);
  }, []);

  const setShowAxes = useCallback((show: boolean) => {
    setShowAxesState(show);
  }, []);

  const addProjectionView = useCallback((sliceIndex: number | 'all', plane: ProjectionPlane) => {
    if (!originalCloud) return;
    let sourceCloud: PointCloud | PointCloudSlice;
    if (sliceIndex === 'all') {
      sourceCloud = originalCloud;
    } else {
      if (slices.length === 0) return;
      sourceCloud = slices[sliceIndex] || slices[0];
    }
    const projected = projectPointCloud(sourceCloud, plane);
    const id = `proj-${++projIdCounter.current}`;
    setProjectionViews(prev => [...prev, { id, sliceIndex, plane, cloud: projected }]);
  }, [originalCloud, slices]);

  const removeProjectionView = useCallback((id: string) => {
    setProjectionViews(prev => prev.filter(v => v.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setOriginalCloud(null);
    setFileName('');
    setSlices([]);
    setProjectionViews([]);
    setViewModeState('all');
  }, []);

  return (
    <PointCloudContext.Provider value={{
      originalCloud,
      fileName,
      splitAxis,
      splitCount,
      slices,
      viewMode,
      activeSliceIndex,
      cameraLocked,
      pointSize,
      showGrid,
      showAxes,
      projectionViews,
      loadCloud,
      setSplitAxis,
      setSplitCount,
      applySplit,
      setViewMode,
      setActiveSliceIndex,
      setCameraLocked,
      setPointSize,
      setShowGrid,
      setShowAxes,
      addProjectionView,
      removeProjectionView,
      clearAll,
    }}>
      {children}
    </PointCloudContext.Provider>
  );
}

export function usePointCloud() {
  const ctx = useContext(PointCloudContext);
  if (!ctx) throw new Error('usePointCloud must be used within PointCloudProvider');
  return ctx;
}
