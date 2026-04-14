/**
 * PointCloudViewer
 * Main 3D canvas component for rendering point clouds.
 * Design: Dark Universe - deep space background, rainbow height coloring.
 */

import { useRef, useEffect } from 'react';
import { usePointCloudRenderer } from '@/hooks/usePointCloudRenderer';
import { usePointCloud } from '@/contexts/PointCloudContext';
import type { PointCloud } from '@/lib/pointCloudParser';

interface PointCloudViewerProps {
  className?: string;
}

export default function PointCloudViewer({ className = '' }: PointCloudViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    originalCloud,
    slices,
    viewMode,
    activeSliceIndex,
    cameraLocked,
    pointSize,
    showGrid,
    showAxes,
    splitAxis,
    splitCount,
  } = usePointCloud();

  const {
    loadPointCloud,
    setPointSize,
    setCameraLocked,
    resetCamera,
    setView,
    setHelpersVisible,
    showSlicePlanes,
    clearSlicePlanes,
  } = usePointCloudRenderer(canvasRef, { pointSize });

  // Sync camera lock
  useEffect(() => {
    setCameraLocked(cameraLocked);
  }, [cameraLocked, setCameraLocked]);

  // Sync point size
  useEffect(() => {
    setPointSize(pointSize);
  }, [pointSize, setPointSize]);

  // Sync grid/axes visibility
  useEffect(() => {
    setHelpersVisible(showGrid, showAxes);
  }, [showGrid, showAxes, setHelpersVisible]);

  // Determine which clouds to render
  useEffect(() => {
    if (!originalCloud) {
      loadPointCloud([]);
      clearSlicePlanes();
      return;
    }

    let cloudsToRender: PointCloud[];

    if (slices.length === 0) {
      cloudsToRender = [originalCloud];
      clearSlicePlanes();
    } else if (viewMode === 'all') {
      cloudsToRender = slices as unknown as PointCloud[];
      // Show slice planes
      showSlicePlanes(splitAxis, splitCount, originalCloud.bounds);
    } else {
      const slice = slices[activeSliceIndex];
      cloudsToRender = slice ? [slice as unknown as PointCloud] : [originalCloud];
      clearSlicePlanes();
    }

    loadPointCloud(cloudsToRender, true);
  }, [originalCloud, slices, viewMode, activeSliceIndex, loadPointCloud, showSlicePlanes, clearSlicePlanes, splitAxis, splitCount]);

  // Compute current point count
  let currentPointCount = 0;
  if (originalCloud) {
    if (slices.length > 0 && viewMode === 'single') {
      currentPointCount = slices[activeSliceIndex]?.count ?? 0;
    } else {
      currentPointCount = originalCloud.count;
    }
  }

  return (
    <div className={`relative w-full h-full ${className}`} style={{ background: '#080c14' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: 'none', cursor: cameraLocked ? 'not-allowed' : 'grab' }}
      />

      {/* Overlay: no cloud loaded */}
      {!originalCloud && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <div className="text-center space-y-4">
            {/* Animated point cloud icon */}
            <div className="w-24 h-24 mx-auto relative">
              <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {[
                  [48, 48, '#4f8ef7', 3, 1],
                  [28, 36, '#4f8ef7', 2, 0.7],
                  [68, 32, '#8b5cf6', 2, 0.7],
                  [22, 60, '#4f8ef7', 1.5, 0.5],
                  [72, 58, '#8b5cf6', 1.5, 0.5],
                  [42, 20, '#06b6d4', 2, 0.6],
                  [58, 70, '#10b981', 2, 0.6],
                  [30, 76, '#f59e0b', 1.5, 0.45],
                  [66, 80, '#ef4444', 1.5, 0.45],
                  [80, 45, '#4f8ef7', 1.5, 0.5],
                  [14, 45, '#8b5cf6', 1.5, 0.5],
                  [55, 14, '#06b6d4', 1.5, 0.4],
                  [38, 82, '#10b981', 1, 0.35],
                  [76, 68, '#f59e0b', 1, 0.35],
                  [18, 25, '#ef4444', 1, 0.3],
                ].map(([cx, cy, fill, r, opacity], i) => (
                  <circle key={i} cx={cx as number} cy={cy as number} r={r as number} fill={fill as string} opacity={opacity as number} />
                ))}
              </svg>
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                导入点云文件以开始
              </p>
              <p className="text-slate-600 text-xs font-mono mt-1">
                支持 .txt 格式 · x y z [r g b]
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View controls overlay - bottom right */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        {(['iso', 'front', 'top', 'side'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-2.5 py-1 text-xs font-mono rounded border border-slate-700/60 bg-slate-900/80 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-colors backdrop-blur-sm"
          >
            {v === 'iso' ? 'ISO' : v === 'front' ? '正视' : v === 'top' ? '俯视' : '侧视'}
          </button>
        ))}
        <button
          onClick={resetCamera}
          className="px-2.5 py-1 text-xs font-mono rounded border border-slate-700/60 bg-slate-900/80 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors backdrop-blur-sm"
        >
          复位
        </button>
      </div>

      {/* Slice indicator - top center */}
      {slices.length > 0 && viewMode === 'single' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono backdrop-blur-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          切片 {activeSliceIndex + 1} / {slices.length}
          <span className="text-blue-400/60">·</span>
          <span className="text-blue-400/80">{slices[activeSliceIndex]?.count?.toLocaleString() ?? 0} pts</span>
        </div>
      )}

      {/* Camera locked indicator - top right */}
      {cameraLocked && (
        <div className="absolute top-4 right-4 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono backdrop-blur-sm flex items-center gap-1.5">
          <span>🔒</span>
          <span>视角已锁定</span>
        </div>
      )}

      {/* Status bar - bottom left */}
      {originalCloud && (
        <div className="absolute bottom-4 left-4 flex items-center gap-3 text-xs font-mono text-slate-600">
          <span>{currentPointCount.toLocaleString()} pts</span>
          {slices.length > 0 && (
            <span className="text-slate-700">
              {splitAxis.toUpperCase()} 轴 × {slices.length}
            </span>
          )}
        </div>
      )}

      {/* Color legend - right side */}
      {originalCloud && (
        <div className="absolute top-4 left-4 flex flex-col items-start gap-1">
          <div className="px-2 py-1.5 rounded bg-slate-900/70 border border-slate-700/30 backdrop-blur-sm">
            <div className="text-[10px] font-mono text-slate-500 mb-1.5">高度映射</div>
            <div
              className="w-3 h-20 rounded-sm"
              style={{
                background: 'linear-gradient(to bottom, #ef4444, #f59e0b, #10b981, #06b6d4, #4f8ef7)',
              }}
            />
            <div className="text-[9px] font-mono text-slate-600 mt-1">
              <div>{originalCloud.bounds.max.z.toFixed(2)}</div>
              <div className="mt-3">{originalCloud.bounds.min.z.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
