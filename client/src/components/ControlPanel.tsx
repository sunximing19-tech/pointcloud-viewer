/**
 * ControlPanel
 * Left sidebar control panel for point cloud operations.
 * Design: Glassmorphism dark panel with Space Grotesk typography.
 * Dark Universe theme.
 */

import { useRef, useState } from 'react';
import { usePointCloud } from '@/contexts/PointCloudContext';
import { parsePointCloud } from '@/lib/pointCloudParser';
import type { SplitAxis, ProjectionPlane } from '@/contexts/PointCloudContext';
import { toast } from 'sonner';
import {
  Upload,
  Scissors,
  Eye,
  Lock,
  Unlock,
  Grid3X3,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize2,
  FileText,
  Sliders,
  Box,
  Plus,
} from 'lucide-react';
import SampleDataLoader from './SampleDataLoader';

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon size={12} className="text-slate-500" />
      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{title}</span>
    </div>
  );
}

export default function ControlPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projSlice, setProjSlice] = useState<'all' | number>('all');
  const [projPlane, setProjPlane] = useState<ProjectionPlane>('xy');

  const {
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
    clearAll,
  } = usePointCloud();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const text = await file.text();
      const cloud = parsePointCloud(text);
      loadCloud(cloud, file.name);
      toast.success(`已加载 ${cloud.count.toLocaleString()} 个点`, { description: file.name });
    } catch (err) {
      toast.error('文件解析失败', { description: err instanceof Error ? err.message : '请检查文件格式' });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplySplit = () => {
    if (!originalCloud) { toast.error('请先导入点云文件'); return; }
    applySplit();
    toast.success(`已沿 ${splitAxis.toUpperCase()} 轴切分为 ${splitCount} 份`);
  };

  const handleAddProjection = () => {
    if (!originalCloud) { toast.error('请先导入点云文件'); return; }
    if (projSlice !== 'all' && slices.length === 0) { toast.error('请先执行切分操作'); return; }
    addProjectionView(projSlice, projPlane);
    toast.success('已添加投影视图', { description: `${projSlice === 'all' ? '整体' : `切片${(projSlice as number) + 1}`} → ${projPlane.toUpperCase()} 平面` });
  };

  const axisColors: Record<SplitAxis, string> = {
    x: 'text-red-400 border-red-500/50 bg-red-500/15',
    y: 'text-green-400 border-green-500/50 bg-green-500/15',
    z: 'text-blue-400 border-blue-500/50 bg-blue-500/15',
  };

  const planeColors: Record<ProjectionPlane, string> = {
    xy: 'text-blue-400 border-blue-500/50 bg-blue-500/15',
    xz: 'text-green-400 border-green-500/50 bg-green-500/15',
    yz: 'text-red-400 border-red-500/50 bg-red-500/15',
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'rgba(8, 12, 20, 0.92)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="px-4 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #8b5cf6 100%)' }}>
            <Layers size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              点云展示平台
            </h1>
            <p className="text-[10px] text-slate-600 font-mono">Point Cloud Viewer</p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">

        {/* ── Import ── */}
        <div>
          <SectionHeader icon={FileText} title="导入文件" />
          <input ref={fileInputRef} type="file" accept=".txt,.xyz,.pts,.asc,.csv" onChange={handleFileSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', boxShadow: '0 0 20px rgba(79,142,247,0.2)' }}
          >
            <Upload size={14} />
            {isLoading ? '解析中...' : '导入点云 (.txt)'}
          </button>

          <SampleDataLoader />

          {fileName && (
            <div className="mt-2 flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 shadow-sm shadow-emerald-400/50"></div>
              <span className="text-xs font-mono text-slate-400 truncate">{fileName}</span>
            </div>
          )}

          {originalCloud && (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[
                { label: '点数', value: originalCloud.count.toLocaleString(), color: 'text-blue-400' },
                { label: '尺寸', value: `${originalCloud.bounds.size.x.toFixed(1)}×${originalCloud.bounds.size.y.toFixed(1)}×${originalCloud.bounds.size.z.toFixed(1)}`, color: 'text-violet-400' },
              ].map(item => (
                <div key={item.label} className="px-2.5 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] text-slate-600 font-mono">{item.label}</div>
                  <div className={`text-xs font-mono mt-0.5 ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

        {/* ── Display ── */}
        <div>
          <SectionHeader icon={Sliders} title="显示设置" />
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-slate-500 font-mono">点大小</span>
                <span className="text-xs text-blue-400 font-mono">{pointSize}px</span>
              </div>
              <input type="range" min={1} max={8} step={0.5} value={pointSize}
                onChange={e => setPointSize(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500"
                style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((pointSize - 1) / 7) * 100}%, rgba(255,255,255,0.1) ${((pointSize - 1) / 7) * 100}%, rgba(255,255,255,0.1) 100%)` }}
              />
            </div>
            <div className="flex gap-2">
              {[
                { label: '网格', icon: Grid3X3, active: showGrid, toggle: () => setShowGrid(!showGrid) },
                { label: '坐标轴', icon: Maximize2, active: showAxes, toggle: () => setShowAxes(!showAxes) },
              ].map(item => (
                <button key={item.label} onClick={item.toggle}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all duration-200"
                  style={{
                    background: item.active ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${item.active ? 'rgba(79,142,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    color: item.active ? '#93c5fd' : '#64748b',
                  }}>
                  <item.icon size={11} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

        {/* ── Camera ── */}
        <div>
          <SectionHeader icon={Eye} title="视角控制" />
          <button
            onClick={() => setCameraLocked(!cameraLocked)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono transition-all duration-200"
            style={{
              background: cameraLocked ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${cameraLocked ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.07)'}`,
              color: cameraLocked ? '#fcd34d' : '#64748b',
            }}
          >
            {cameraLocked ? <Lock size={12} /> : <Unlock size={12} />}
            {cameraLocked ? '视角已锁定 (点击解锁)' : '锁定当前视角'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

        {/* ── Split ── */}
        <div>
          <SectionHeader icon={Scissors} title="点云切分" />
          <div className="space-y-2.5">
            {/* Axis selector */}
            <div>
              <p className="text-[10px] text-slate-600 font-mono mb-1.5">切分轴向</p>
              <div className="grid grid-cols-3 gap-1">
                {(['x', 'y', 'z'] as SplitAxis[]).map(axis => (
                  <button key={axis} onClick={() => setSplitAxis(axis)}
                    className="py-1.5 rounded-lg text-xs font-mono border transition-all duration-200"
                    style={{
                      background: splitAxis === axis ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${splitAxis === axis ? 'rgba(79,142,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      color: splitAxis === axis ? '#93c5fd' : '#475569',
                    }}>
                    {axis.toUpperCase()} 轴
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[10px] text-slate-600 font-mono">切分份数</p>
                <span className="text-xs text-blue-400 font-mono">{splitCount} 份</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="range" min={2} max={20} step={1} value={splitCount}
                  onChange={e => setSplitCount(parseInt(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500"
                  style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((splitCount - 2) / 18) * 100}%, rgba(255,255,255,0.1) ${((splitCount - 2) / 18) * 100}%, rgba(255,255,255,0.1) 100%)` }}
                />
                <input type="number" min={2} max={50} value={splitCount}
                  onChange={e => setSplitCount(parseInt(e.target.value) || 2)}
                  className="w-12 rounded-lg px-1.5 py-1 text-xs text-slate-200 font-mono text-center focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>

            <button onClick={handleApplySplit}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)', boxShadow: '0 0 16px rgba(79,70,229,0.2)' }}>
              <Scissors size={13} />
              执行切分
            </button>
          </div>
        </div>

        {/* ── Slice Navigation ── */}
        {slices.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />
            <div>
              <SectionHeader icon={Box} title="切片查看" />
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {(['all', 'single'] as const).map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className="py-2 rounded-lg text-xs font-mono transition-all duration-200"
                      style={{
                        background: viewMode === mode ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${viewMode === mode ? 'rgba(79,142,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        color: viewMode === mode ? '#93c5fd' : '#475569',
                      }}>
                      {mode === 'all' ? '整体查看' : '单片查看'}
                    </button>
                  ))}
                </div>

                {viewMode === 'single' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button onClick={() => setActiveSliceIndex(Math.max(0, activeSliceIndex - 1))}
                        disabled={activeSliceIndex === 0}
                        className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
                        <ChevronLeft size={13} />
                      </button>
                      <span className="text-xs font-mono text-slate-400">
                        {activeSliceIndex + 1} / {slices.length}
                      </span>
                      <button onClick={() => setActiveSliceIndex(Math.min(slices.length - 1, activeSliceIndex + 1))}
                        disabled={activeSliceIndex === slices.length - 1}
                        className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    {/* Slice grid */}
                    <div className="grid grid-cols-5 gap-1 max-h-28 overflow-y-auto">
                      {slices.map((_, i) => (
                        <button key={i} onClick={() => setActiveSliceIndex(i)}
                          className="py-1.5 rounded text-[10px] font-mono transition-all duration-150"
                          style={{
                            background: activeSliceIndex === i ? 'rgba(79,142,247,0.25)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${activeSliceIndex === i ? 'rgba(79,142,247,0.5)' : 'rgba(255,255,255,0.06)'}`,
                            color: activeSliceIndex === i ? '#93c5fd' : '#475569',
                          }}>
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    {/* Slice info */}
                    {slices[activeSliceIndex] && (
                      <div className="px-2.5 py-2 rounded-lg" style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)' }}>
                        <div className="text-[10px] font-mono text-slate-500">切片 {activeSliceIndex + 1} 信息</div>
                        <div className="text-xs font-mono text-blue-400 mt-0.5">{slices[activeSliceIndex].count.toLocaleString()} 个点</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

        {/* ── Projection ── */}
        <div>
          <SectionHeader icon={Maximize2} title="平面投影" />
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] text-slate-600 font-mono mb-1.5">投影来源</p>
              <select value={projSlice === 'all' ? 'all' : projSlice}
                onChange={e => setProjSlice(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="all">整体点云</option>
                {slices.map((_, i) => (
                  <option key={i} value={i}>切片 {i + 1}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-[10px] text-slate-600 font-mono mb-1.5">投影平面</p>
              <div className="grid grid-cols-3 gap-1">
                {(['xy', 'xz', 'yz'] as ProjectionPlane[]).map(p => (
                  <button key={p} onClick={() => setProjPlane(p)}
                    className="py-1.5 rounded-lg text-xs font-mono border transition-all duration-200"
                    style={{
                      background: projPlane === p ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${projPlane === p ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      color: projPlane === p ? '#c4b5fd' : '#475569',
                    }}>
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-600 font-mono mt-1">
                {projPlane === 'xy' ? 'XY → 俯视投影' : projPlane === 'xz' ? 'XZ → 正视投影' : 'YZ → 侧视投影'}
              </p>
            </div>

            <button onClick={handleAddProjection}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)', boxShadow: '0 0 16px rgba(109,40,217,0.2)' }}>
              <Plus size={13} />
              添加投影视图
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

        {/* Clear */}
        {originalCloud && (
          <button onClick={() => { clearAll(); toast.info('已清除所有数据'); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono transition-all duration-200"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
            <RotateCcw size={11} />
            清除所有数据
          </button>
        )}

        {/* Bottom padding */}
        <div className="h-2" />
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] font-mono text-slate-700 text-center">
          左键旋转 · 右键平移 · 滚轮缩放
        </p>
      </div>
    </div>
  );
}
