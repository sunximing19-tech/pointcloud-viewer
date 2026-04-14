/**
 * Home Page - Point Cloud Viewer
 * Design: Dark Universe - deep space immersive visualization
 * Layout: Left control panel (280px, collapsible) + Right full-height area
 *   Right area = 3D viewer (flex-1) + optional bottom analysis panel (fixed height)
 *
 * Toggle button fix: positioned absolutely over the canvas edge so it is always
 * clickable regardless of whether the panel is collapsed or expanded.
 */

import { useState, useCallback } from 'react';
import ControlPanel from '@/components/ControlPanel';
import PointCloudViewer from '@/components/PointCloudViewer';
import ProjectionPanel from '@/components/ProjectionPanel';
import { PointCloudProvider } from '@/contexts/PointCloudContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PANEL_WIDTH = 280;

function MainLayout() {
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      className="w-screen overflow-hidden"
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'row',
        background: '#080c14',
        fontFamily: "'Space Grotesk', sans-serif",
        position: 'relative',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Left Control Panel */}
      <div
        className="relative flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: panelCollapsed ? 0 : PANEL_WIDTH, height: '100%' }}
      >
        <div className="absolute inset-0" style={{ width: PANEL_WIDTH }}>
          <ControlPanel />
        </div>
      </div>

      {/* Right Content Area */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 3D Viewer */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <PointCloudViewer className="absolute inset-0 w-full h-full" />
        </div>

        {/* Analysis panel */}
        <ProjectionPanel />
      </div>

      {/* Toggle button — absolutely positioned over the panel/canvas boundary,
          always rendered on top so it remains clickable when panel is collapsed */}
      <button
        onClick={() => setPanelCollapsed(!panelCollapsed)}
        className="transition-all duration-300 ease-in-out"
        style={{
          position: 'absolute',
          left: panelCollapsed ? 0 : PANEL_WIDTH,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 50,
          width: 20,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '0 6px 6px 0',
          background: 'rgba(15,23,42,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderLeft: panelCollapsed ? '1px solid rgba(255,255,255,0.1)' : 'none',
          color: '#64748b',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#93c5fd'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
        title={panelCollapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {panelCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </div>
  );
}

export default function Home() {
  return (
    <PointCloudProvider>
      <MainLayout />
    </PointCloudProvider>
  );
}
