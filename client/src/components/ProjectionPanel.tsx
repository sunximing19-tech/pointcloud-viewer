/**
 * ProjectionPanel
 * Bottom panel: shows projection views AND density histogram views.
 * Design: Dark Universe - glassmorphism panel.
 * Layout: horizontally scrollable card row, collapsible.
 */

import { useState } from 'react';
import { usePointCloud } from '@/contexts/PointCloudContext';
import ProjectionViewer from './ProjectionViewer';
import DensityHistogramViewer from './DensityHistogramViewer';
import { ChevronDown, ChevronUp } from 'lucide-react';

const PANEL_HEIGHT = 280;

export default function ProjectionPanel() {
  const {
    projectionViews, removeProjectionView,
    histogramViews, removeHistogramView, recomputeHistogram,
  } = usePointCloud();
  const [collapsed, setCollapsed] = useState(false);

  const total = projectionViews.length + histogramViews.length;
  if (total === 0) return null;

  return (
    <div
      className="flex-shrink-0 transition-all duration-300"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,12,20,0.85)',
        backdropFilter: 'blur(12px)',
        height: collapsed ? 36 : PANEL_HEIGHT,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-9 cursor-pointer select-none"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">分析视图</span>
          {projectionViews.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'rgba(79,142,247,0.15)', color: '#93c5fd', border: '1px solid rgba(79,142,247,0.2)' }}>
              投影 {projectionViews.length}
            </span>
          )}
          {histogramViews.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' }}>
              密度图 {histogramViews.length}
            </span>
          )}
        </div>
        <button className="text-slate-600 hover:text-slate-400 transition-colors">
          {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex gap-3 px-3 py-2 overflow-x-auto h-[calc(100%-36px)]">
          {projectionViews.map(view => {
            const sliceLabel = view.sliceIndex === 'all'
              ? '整体点云'
              : `切片 ${(view.sliceIndex as number) + 1}`;
            return (
              <div key={view.id} style={{ width: 320, minWidth: 320, height: '100%' }}>
                <ProjectionViewer
                  id={view.id}
                  cloud={view.cloud}
                  plane={view.plane}
                  sliceLabel={sliceLabel}
                  onClose={() => removeProjectionView(view.id)}
                />
              </div>
            );
          })}
          {histogramViews.map(view => (
            <div key={view.id} style={{ width: 380, minWidth: 380, height: '100%' }}>
              <DensityHistogramViewer
                id={view.id}
                histogram={view.histogram}
                sliceLabel={view.label}
                onClose={() => removeHistogramView(view.id)}
                onRecompute={() => recomputeHistogram(view.id, view.multiplier)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
