/**
 * Home Page - Point Cloud Viewer
 * Design: Dark Universe - deep space immersive visualization
 * Layout: Left control panel (280px, collapsible) + Right 3D canvas + Bottom projection panel
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
      className="h-screen w-screen flex overflow-hidden"
      style={{ background: '#080c14', fontFamily: "'Space Grotesk', sans-serif" }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Left Control Panel */}
      <div
        className="relative flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: panelCollapsed ? 0 : PANEL_WIDTH }}
      >
        <div className="absolute inset-0" style={{ width: PANEL_WIDTH }}>
          <ControlPanel />
        </div>
      </div>

      {/* Panel toggle button */}
      <div
        className="relative z-20 flex-shrink-0"
        style={{ width: 0 }}
      >
        <button
          onClick={() => setPanelCollapsed(!panelCollapsed)}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-12 flex items-center justify-center rounded transition-all duration-200 hover:scale-110"
          style={{
            background: 'rgba(15,23,42,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#475569',
            backdropFilter: 'blur(8px)',
          }}
        >
          {panelCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 3D Viewer - takes remaining space */}
        <div className="flex-1 relative min-h-0">
          <PointCloudViewer className="absolute inset-0" />
        </div>

        {/* Projection Panel - fixed height at bottom */}
        <ProjectionPanel />
      </div>
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
