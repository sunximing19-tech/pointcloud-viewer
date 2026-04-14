/**
 * Home Page - Point Cloud Viewer
 * Design: Dark Universe - deep space immersive visualization
 * Layout:
 *   [ProjectSidebar 160px] [ControlPanel 280px] [3D Viewer + Analysis Panel]
 * Both sidebars are independently collapsible.
 * ProjectContext wraps everything; PointCloudContext is per-active-project.
 */

import { useState, useCallback, useEffect } from 'react';
import ControlPanel from '@/components/ControlPanel';
import PointCloudViewer from '@/components/PointCloudViewer';
import ProjectionPanel from '@/components/ProjectionPanel';
import ProjectSidebar from '@/components/ProjectSidebar';
import { PointCloudProvider, usePointCloud } from '@/contexts/PointCloudContext';
import { ProjectProvider, useProject } from '@/contexts/ProjectContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PROJECT_SIDEBAR_WIDTH = 160;
const CONTROL_PANEL_WIDTH = 280;

/**
 * Inner layout — has access to both contexts.
 * Syncs active project's cloud into PointCloudContext when project switches.
 */
function MainLayout() {
  const [projectCollapsed, setProjectCollapsed] = useState(false);
  const [controlCollapsed, setControlCollapsed] = useState(false);

  const { activeProject } = useProject();
  const { loadCloud, clearAll } = usePointCloud();

  // When active project changes, load its cloud (or clear if empty)
  useEffect(() => {
    if (activeProject?.cloud) {
      loadCloud(activeProject.cloud, activeProject.fileName);
    } else {
      clearAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  const projectLeft = 0;
  const controlLeft = projectCollapsed ? 0 : PROJECT_SIDEBAR_WIDTH;
  const toggleControlLeft = controlLeft + (controlCollapsed ? 0 : CONTROL_PANEL_WIDTH);

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
      {/* Project Sidebar */}
      <div
        className="relative flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: projectCollapsed ? 0 : PROJECT_SIDEBAR_WIDTH, height: '100%' }}
      >
        <div className="absolute inset-0" style={{ width: PROJECT_SIDEBAR_WIDTH }}>
          <ProjectSidebar />
        </div>
      </div>

      {/* Control Panel */}
      <div
        className="relative flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: controlCollapsed ? 0 : CONTROL_PANEL_WIDTH, height: '100%' }}
      >
        <div className="absolute inset-0" style={{ width: CONTROL_PANEL_WIDTH }}>
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
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <PointCloudViewer className="absolute inset-0 w-full h-full" />
        </div>
        <ProjectionPanel />
      </div>

      {/* Project sidebar toggle */}
      <button
        onClick={() => setProjectCollapsed(!projectCollapsed)}
        className="transition-all duration-300 ease-in-out"
        style={{
          position: 'absolute',
          left: projectCollapsed ? 0 : PROJECT_SIDEBAR_WIDTH,
          top: '35%',
          transform: 'translateY(-50%)',
          zIndex: 50,
          width: 18,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '0 5px 5px 0',
          background: 'rgba(10,15,25,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: projectCollapsed ? '1px solid rgba(255,255,255,0.08)' : 'none',
          color: '#475569',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#60a5fa'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
        title={projectCollapsed ? '展开项目列表' : '收起项目列表'}
      >
        {projectCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      {/* Control panel toggle */}
      <button
        onClick={() => setControlCollapsed(!controlCollapsed)}
        className="transition-all duration-300 ease-in-out"
        style={{
          position: 'absolute',
          left: toggleControlLeft,
          top: '65%',
          transform: 'translateY(-50%)',
          zIndex: 50,
          width: 18,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '0 5px 5px 0',
          background: 'rgba(10,15,25,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: controlCollapsed ? '1px solid rgba(255,255,255,0.08)' : 'none',
          color: '#475569',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#60a5fa'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
        title={controlCollapsed ? '展开控制面板' : '收起控制面板'}
      >
        {controlCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </div>
  );
}

export default function Home() {
  return (
    <ProjectProvider>
      <PointCloudProvider>
        <MainLayout />
      </PointCloudProvider>
    </ProjectProvider>
  );
}
