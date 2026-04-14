/**
 * PointCloudContext
 * Global state for point cloud data, slices, view settings, and density histograms.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { PointCloud, PointCloudSlice } from '@/lib/pointCloudParser';
import { splitPointCloud, projectPointCloud } from '@/lib/pointCloudParser';
import type { DensityHistogram, HistogramAxis } from '@/lib/densityHistogram';
import { computeDensityHistogram, estimateMedianNN } from '@/lib/densityHistogram';

export type SplitAxis = 'x' | 'y' | 'z';
export type ProjectionPlane = 'xy' | 'xz' | 'yz';
export type ViewMode = 'all' | 'single';

export interface ProjectionView {
  id: string;
  sliceIndex: number | 'all';
  plane: ProjectionPlane;
  cloud: PointCloud;
}

export interface HistogramView {
  id: string;
  sliceIndex: number | 'all';
  projAxis: HistogramAxis;
  multiplier: number;
  histogram: DensityHistogram;
  label: string;
}

interface PointCloudState {
  originalCloud: PointCloud | null;
  fileName: string;
  medianNN: number | null;

  splitAxis: SplitAxis;
  splitCount: number;
  slices: PointCloudSlice[];

  viewMode: ViewMode;
  activeSliceIndex: number;
  cameraLocked: boolean;
  pointSize: number;
  showGrid: boolean;
  showAxes: boolean;

  projectionViews: ProjectionView[];
  histogramViews: HistogramView[];

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
  addHistogramView: (sliceIndex: number | 'all', projAxis: HistogramAxis, multiplier: number) => void;
  removeHistogramView: (id: string) => void;
  recomputeHistogram: (id: string, multiplier: number) => void;
  clearAll: () => void;
}

const PointCloudContext = createContext<PointCloudState | null>(null);

export function PointCloudProvider({ children }: { children: React.ReactNode }) {
  const [originalCloud, setOriginalCloud] = useState<PointCloud | null>(null);
  const [fileName, setFileName] = useState('');
  const [medianNN, setMedianNN] = useState<number | null>(null);
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
  const [histogramViews, setHistogramViews] = useState<HistogramView[]>([]);

  const idCounter = useRef(0);
  const nextId = () => `view-${++idCounter.current}`;

  const loadCloud = useCallback((cloud: PointCloud, name: string) => {
    setOriginalCloud(cloud);
    setFileName(name);
    setSlices([]);
    setViewModeState('all');
    setActiveSliceIndexState(0);
    setProjectionViews([]);
    setHistogramViews([]);
    // Compute median NN asynchronously
    setTimeout(() => {
      const nn = estimateMedianNN(cloud.points, cloud.count);
      setMedianNN(nn);
    }, 0);
  }, []);

  const setSplitAxis = useCallback((axis: SplitAxis) => setSplitAxisState(axis), []);
  const setSplitCount = useCallback((n: number) => setSplitCountState(Math.max(1, Math.min(50, n))), []);

  const applySplit = useCallback(() => {
    if (!originalCloud) return;
    const newSlices = splitPointCloud(originalCloud, splitAxis, splitCount);
    setSlices(newSlices);
    setViewModeState('all');
    setActiveSliceIndexState(0);
  }, [originalCloud, splitAxis, splitCount]);

  const setViewMode = useCallback((mode: ViewMode) => setViewModeState(mode), []);
  const setActiveSliceIndex = useCallback((idx: number) => setActiveSliceIndexState(idx), []);
  const setCameraLocked = useCallback((locked: boolean) => setCameraLockedState(locked), []);
  const setPointSize = useCallback((size: number) => setPointSizeState(size), []);
  const setShowGrid = useCallback((show: boolean) => setShowGridState(show), []);
  const setShowAxes = useCallback((show: boolean) => setShowAxesState(show), []);

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
    setProjectionViews(prev => [...prev, { id: nextId(), sliceIndex, plane, cloud: projected }]);
  }, [originalCloud, slices]);

  const removeProjectionView = useCallback((id: string) => {
    setProjectionViews(prev => prev.filter(v => v.id !== id));
  }, []);

  const addHistogramView = useCallback((
    sliceIndex: number | 'all',
    projAxis: HistogramAxis,
    multiplier: number
  ) => {
    if (!originalCloud) return;
    let sourceCloud: PointCloud | PointCloudSlice;
    if (sliceIndex === 'all') {
      sourceCloud = originalCloud;
    } else {
      if (slices.length === 0) return;
      sourceCloud = slices[sliceIndex as number] || slices[0];
    }
    const nn = medianNN ?? estimateMedianNN(sourceCloud.points, sourceCloud.count);
    const histogram = computeDensityHistogram(sourceCloud, projAxis, multiplier, nn);
    const label = sliceIndex === 'all' ? '整体点云' : `切片 ${(sliceIndex as number) + 1}`;
    setHistogramViews(prev => [...prev, { id: nextId(), sliceIndex, projAxis, multiplier, histogram, label }]);
  }, [originalCloud, slices, medianNN]);

  const removeHistogramView = useCallback((id: string) => {
    setHistogramViews(prev => prev.filter(v => v.id !== id));
  }, []);

  const recomputeHistogram = useCallback((id: string, multiplier: number) => {
    if (!originalCloud) return;
    setHistogramViews(prev => prev.map(v => {
      if (v.id !== id) return v;
      let sourceCloud: PointCloud | PointCloudSlice;
      if (v.sliceIndex === 'all') {
        sourceCloud = originalCloud;
      } else {
        if (slices.length === 0) return v;
        sourceCloud = slices[v.sliceIndex as number] || slices[0];
      }
      const nn = medianNN ?? estimateMedianNN(sourceCloud.points, sourceCloud.count);
      const histogram = computeDensityHistogram(sourceCloud, v.projAxis, multiplier, nn);
      return { ...v, multiplier, histogram };
    }));
  }, [originalCloud, slices, medianNN]);

  const clearAll = useCallback(() => {
    setOriginalCloud(null);
    setFileName('');
    setMedianNN(null);
    setSlices([]);
    setProjectionViews([]);
    setHistogramViews([]);
    setViewModeState('all');
  }, []);

  return (
    <PointCloudContext.Provider value={{
      originalCloud, fileName, medianNN,
      splitAxis, splitCount, slices,
      viewMode, activeSliceIndex, cameraLocked, pointSize, showGrid, showAxes,
      projectionViews, histogramViews,
      loadCloud, setSplitAxis, setSplitCount, applySplit,
      setViewMode, setActiveSliceIndex, setCameraLocked, setPointSize,
      setShowGrid, setShowAxes,
      addProjectionView, removeProjectionView,
      addHistogramView, removeHistogramView, recomputeHistogram,
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
