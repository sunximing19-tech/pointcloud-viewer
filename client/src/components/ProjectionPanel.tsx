/**
 * ProjectionPanel
 * Bottom panel showing all projection views.
 * Design: Dark Universe - glassmorphism panel.
 */

import { useState } from 'react';
import { usePointCloud } from '@/contexts/PointCloudContext';
import ProjectionViewer from './ProjectionViewer';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ProjectionPanel() {
  const { projectionViews, removeProjectionView } = usePointCloud();
  const [collapsed, setCollapsed] = useState(false);

  if (projectionViews.length === 0) return null;

  return (
    <div
      className="flex-shrink-0 transition-all duration-300"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,12,20,0.85)',
        backdropFilter: 'blur(12px)',
        height: collapsed ? 36 : 260,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-9 cursor-pointer select-none"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">投影视图</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: 'rgba(79,142,247,0.15)', color: '#93c5fd', border: '1px solid rgba(79,142,247,0.2)' }}>
            {projectionViews.length}
          </span>
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
              <div key={view.id} style={{ width: 300, minWidth: 300, height: '100%' }}>
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
        </div>
      )}
    </div>
  );
}
