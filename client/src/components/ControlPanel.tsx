/**
 * ControlPanel
 * Left sidebar with all controls.
 * Design: Dark Universe - glassmorphism sidebar, Space Grotesk font.
 * Sections: Import, Display, Camera, Slice, Projection, Density Histogram
 */

import { useRef, useState, useCallback } from 'react';
import { usePointCloud } from '@/contexts/PointCloudContext';
import { parsePointCloud } from '@/lib/pointCloudParser';
import type { SplitAxis, ProjectionPlane } from '@/contexts/PointCloudContext';
import type { HistogramAxis } from '@/lib/densityHistogram';
import { toast } from 'sonner';
import {
  Upload, Scissors, Eye, Lock, Unlock, Grid3X3, Layers,
  RotateCcw, Maximize2, FileText, Sliders, Box, Plus, BarChart2,
} from 'lucide-react';
import SampleDataLoader from './SampleDataLoader';

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon size={12} className="text-blue-400 flex-shrink-0" />
      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{title}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-3" style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />;
}

export default function ControlPanel() {
  const {
    originalCloud, fileName, medianNN,
    splitAxis, splitCount, slices, viewMode, activeSliceIndex,
    cameraLocked, pointSize, showGrid, showAxes,
    setSplitAxis, setSplitCount, applySplit,
    setViewMode, setActiveSliceIndex, setCameraLocked,
    setPointSize, setShowGrid, setShowAxes,
    addProjectionView, addHistogramView,
    loadCloud,
  } = usePointCloud();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Projection state
  const [projPlane, setProjPlane] = useState<ProjectionPlane>('xy');
  const [projSource, setProjSource] = useState<'all' | number>('all');

  // Histogram state
  const [histAxis, setHistAxis] = useState<HistogramAxis>('z');
  const [histSource, setHistSource] = useState<'all' | number>('all');
  const [histMultiplier, setHistMultiplier] = useState(1.0);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const text = await file.text();
      const cloud = parsePointCloud(text);
      loadCloud(cloud, file.name);
      toast.success(`已导入 ${cloud.count.toLocaleString()} 个点`, { description: file.name });
    } catch (err) {
      toast.error('解析失败', { description: String(err) });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [loadCloud]);

  const handleAddProjection = useCallback(() => {
    if (!originalCloud) { toast.error('请先导入点云'); return; }
    if (projSource !== 'all' && slices.length === 0) { toast.error('请先执行切分'); return; }
    addProjectionView(projSource, projPlane);
    toast.success('已添加投影视图');
  }, [originalCloud, projSource, projPlane, slices, addProjectionView]);

  const handleAddHistogram = useCallback(() => {
    if (!originalCloud) { toast.error('请先导入点云'); return; }
    if (histSource !== 'all' && slices.length === 0) { toast.error('请先执行切分'); return; }
    addHistogramView(histSource, histAxis, histMultiplier);
    toast.success('已添加密度直方图');
  }, [originalCloud, histSource, histAxis, histMultiplier, slices, addHistogramView]);

  const axisBtn = (label: string, val: SplitAxis) => (
    <button
      key={val}
      onClick={() => setSplitAxis(val)}
      className="flex-1 py-1.5 text-xs font-mono rounded transition-all duration-150"
      style={{
        background: splitAxis === val ? 'rgba(79,142,247,0.25)' : 'rgba(255,255,255,0.04)',
        border: splitAxis === val ? '1px solid rgba(79,142,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
        color: splitAxis === val ? '#93c5fd' : '#475569',
      }}
    >
      {label}
    </button>
  );

  const planeBtn = (label: string, val: ProjectionPlane) => (
    <button
      key={val}
      onClick={() => setProjPlane(val)}
      className="flex-1 py-1.5 text-xs font-mono rounded transition-all duration-150"
      style={{
        background: projPlane === val ? 'rgba(79,142,247,0.25)' : 'rgba(255,255,255,0.04)',
        border: projPlane === val ? '1px solid rgba(79,142,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
        color: projPlane === val ? '#93c5fd' : '#475569',
      }}
    >
      {label}
    </button>
  );

  const histAxisBtn = (label: string, val: HistogramAxis) => (
    <button
      key={val}
      onClick={() => setHistAxis(val)}
      className="flex-1 py-1.5 text-xs font-mono rounded transition-all duration-150"
      style={{
        background: histAxis === val ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
        border: histAxis === val ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)',
        color: histAxis === val ? '#fcd34d' : '#475569',
      }}
    >
      {label}
    </button>
  );

  const sliceOptions = slices.map((_, i) => (
    <option key={i} value={i}>切片 {i + 1}</option>
  ));

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: 'rgba(8,12,20,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e40af, #1d4ed8)', boxShadow: '0 0 12px rgba(59,130,246,0.3)' }}>
            <Box size={14} className="text-blue-200" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>点云展示平台</div>
            <div className="text-[10px] font-mono text-slate-600">Point Cloud Viewer</div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>

        {/* Import */}
        <SectionHeader icon={FileText} title="导入文件" />
        <input ref={fileInputRef} type="file" accept=".txt,.xyz,.pts,.csv" className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: isLoading ? 'rgba(59,130,246,0.1)' : 'linear-gradient(135deg, rgba(37,99,235,0.8), rgba(29,78,216,0.8))',
            border: '1px solid rgba(59,130,246,0.3)',
            color: isLoading ? '#475569' : '#bfdbfe',
            boxShadow: isLoading ? 'none' : '0 0 16px rgba(59,130,246,0.15)',
          }}
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
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <div className="px-2 py-1.5 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] font-mono text-slate-600">点数</div>
              <div className="text-xs font-mono text-slate-300">{originalCloud.count.toLocaleString()}</div>
            </div>
            <div className="px-2 py-1.5 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] font-mono text-slate-600">中位NN</div>
              <div className="text-xs font-mono text-slate-300">{medianNN !== null ? medianNN.toFixed(4) : '—'}</div>
            </div>
          </div>
        )}

        <Divider />

        {/* Display */}
        <SectionHeader icon={Sliders} title="显示设置" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono text-slate-500">点大小</span>
          <span className="text-xs font-mono text-blue-400">{pointSize}px</span>
        </div>
        <input type="range" min={1} max={8} step={0.5} value={pointSize}
          onChange={e => setPointSize(Number(e.target.value))}
          className="w-full h-1 rounded-full appearance-none mb-3"
          style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((pointSize - 1) / 7) * 100}%, rgba(255,255,255,0.1) ${((pointSize - 1) / 7) * 100}%, rgba(255,255,255,0.1) 100%)` }}
        />
        <div className="flex gap-2">
          <button onClick={() => setShowGrid(!showGrid)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all"
            style={{
              background: showGrid ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
              border: showGrid ? '1px solid rgba(79,142,247,0.35)' : '1px solid rgba(255,255,255,0.08)',
              color: showGrid ? '#93c5fd' : '#475569',
            }}>
            <Grid3X3 size={11} /> 网格
          </button>
          <button onClick={() => setShowAxes(!showAxes)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all"
            style={{
              background: showAxes ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
              border: showAxes ? '1px solid rgba(79,142,247,0.35)' : '1px solid rgba(255,255,255,0.08)',
              color: showAxes ? '#93c5fd' : '#475569',
            }}>
            <Maximize2 size={11} /> 坐标轴
          </button>
        </div>

        <Divider />

        {/* Camera */}
        <SectionHeader icon={Eye} title="视角控制" />
        <button
          onClick={() => setCameraLocked(!cameraLocked)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono transition-all mb-2"
          style={{
            background: cameraLocked ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
            border: cameraLocked ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
            color: cameraLocked ? '#fca5a5' : '#475569',
          }}>
          {cameraLocked ? <Lock size={11} /> : <Unlock size={11} />}
          {cameraLocked ? '解锁视角' : '锁定当前视角'}
        </button>

        <Divider />

        {/* Slice */}
        <SectionHeader icon={Scissors} title="点云切分" />
        <div className="text-[10px] font-mono text-slate-600 mb-1.5">切分轴向</div>
        <div className="flex gap-1.5 mb-3">
          {axisBtn('X 轴', 'x')}
          {axisBtn('Y 轴', 'y')}
          {axisBtn('Z 轴', 'z')}
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono text-slate-600">切分份数</span>
          <span className="text-xs font-mono text-blue-400">{splitCount} 份</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input type="range" min={2} max={50} step={1} value={splitCount}
            onChange={e => setSplitCount(Number(e.target.value))}
            className="flex-1 h-1 rounded-full appearance-none"
            style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((splitCount - 2) / 48) * 100}%, rgba(255,255,255,0.1) ${((splitCount - 2) / 48) * 100}%, rgba(255,255,255,0.1) 100%)` }}
          />
          <input type="number" min={2} max={50} value={splitCount}
            onChange={e => setSplitCount(Number(e.target.value))}
            className="w-12 text-center text-xs font-mono rounded-md py-1 bg-transparent"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd' }}
          />
        </div>
        <button
          onClick={() => { applySplit(); toast.success(`已切分为 ${splitCount} 份`); }}
          disabled={!originalCloud}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all mb-3"
          style={{
            background: originalCloud ? 'linear-gradient(135deg, rgba(37,99,235,0.7), rgba(29,78,216,0.7))' : 'rgba(255,255,255,0.03)',
            border: originalCloud ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
            color: originalCloud ? '#bfdbfe' : '#334155',
          }}>
          <Scissors size={13} /> 执行切分
        </button>

        {/* Slice viewer */}
        {slices.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <button onClick={() => setViewMode('all')}
                className="flex-1 py-1.5 text-xs font-mono rounded transition-all"
                style={{
                  background: viewMode === 'all' ? 'rgba(79,142,247,0.2)' : 'rgba(255,255,255,0.04)',
                  border: viewMode === 'all' ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: viewMode === 'all' ? '#93c5fd' : '#475569',
                }}>
                <Layers size={10} className="inline mr-1" />整体
              </button>
              <button onClick={() => setViewMode('single')}
                className="flex-1 py-1.5 text-xs font-mono rounded transition-all"
                style={{
                  background: viewMode === 'single' ? 'rgba(79,142,247,0.2)' : 'rgba(255,255,255,0.04)',
                  border: viewMode === 'single' ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: viewMode === 'single' ? '#93c5fd' : '#475569',
                }}>
                <Eye size={10} className="inline mr-1" />单片
              </button>
            </div>
            {viewMode === 'single' && (
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveSliceIndex(Math.max(0, activeSliceIndex - 1))}
                  className="w-7 h-7 flex items-center justify-center rounded text-xs font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}>
                  ‹
                </button>
                <div className="flex-1 text-center text-xs font-mono text-slate-300">
                  {activeSliceIndex + 1} / {slices.length}
                </div>
                <button onClick={() => setActiveSliceIndex(Math.min(slices.length - 1, activeSliceIndex + 1))}
                  className="w-7 h-7 flex items-center justify-center rounded text-xs font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}>
                  ›
                </button>
              </div>
            )}
          </div>
        )}

        <Divider />

        {/* Projection */}
        <SectionHeader icon={Box} title="平面投影" />
        <div className="text-[10px] font-mono text-slate-600 mb-1.5">投影平面</div>
        <div className="flex gap-1.5 mb-3">
          {planeBtn('XY', 'xy')}
          {planeBtn('XZ', 'xz')}
          {planeBtn('YZ', 'yz')}
        </div>
        <div className="text-[10px] font-mono text-slate-600 mb-1.5">投影来源</div>
        <select
          value={projSource === 'all' ? 'all' : String(projSource)}
          onChange={e => setProjSource(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="w-full text-xs font-mono rounded-lg px-2.5 py-2 mb-3 appearance-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
        >
          <option value="all">整体点云</option>
          {sliceOptions}
        </select>
        <button onClick={handleAddProjection}
          disabled={!originalCloud}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono transition-all"
          style={{
            background: originalCloud ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)',
            border: originalCloud ? '1px solid rgba(79,142,247,0.3)' : '1px solid rgba(255,255,255,0.06)',
            color: originalCloud ? '#93c5fd' : '#334155',
          }}>
          <Plus size={12} /> 添加投影视图
        </button>

        <Divider />

        {/* Density Histogram */}
        <SectionHeader icon={BarChart2} title="点密度直方图" />
        <div className="text-[10px] font-mono text-slate-600 mb-1.5">投影轴（沿此轴压缩）</div>
        <div className="flex gap-1.5 mb-3">
          {histAxisBtn('X 轴', 'x')}
          {histAxisBtn('Y 轴', 'y')}
          {histAxisBtn('Z 轴', 'z')}
        </div>

        <div className="text-[10px] font-mono text-slate-600 mb-1.5">数据来源</div>
        <select
          value={histSource === 'all' ? 'all' : String(histSource)}
          onChange={e => setHistSource(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="w-full text-xs font-mono rounded-lg px-2.5 py-2 mb-3 appearance-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
        >
          <option value="all">整体点云</option>
          {sliceOptions}
        </select>

        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono text-slate-600">网格倍率</span>
          <span className="text-xs font-mono text-amber-400">{histMultiplier.toFixed(1)}×</span>
        </div>
        <div className="text-[10px] font-mono text-slate-700 mb-1.5">
          格网大小 = {histMultiplier.toFixed(1)} × 中位最近邻距离
          {medianNN !== null && (
            <span className="text-slate-600"> ≈ {(histMultiplier * medianNN).toFixed(4)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input type="range" min={0.1} max={10} step={0.1} value={histMultiplier}
            onChange={e => setHistMultiplier(Number(e.target.value))}
            className="flex-1 h-1 rounded-full appearance-none"
            style={{ background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((histMultiplier - 0.1) / 9.9) * 100}%, rgba(255,255,255,0.1) ${((histMultiplier - 0.1) / 9.9) * 100}%, rgba(255,255,255,0.1) 100%)` }}
          />
          <input type="number" min={0.1} max={20} step={0.1} value={histMultiplier}
            onChange={e => setHistMultiplier(Number(e.target.value))}
            className="w-14 text-center text-xs font-mono rounded-md py-1 bg-transparent"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#fcd34d' }}
          />
        </div>
        <button onClick={handleAddHistogram}
          disabled={!originalCloud}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono transition-all"
          style={{
            background: originalCloud ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
            border: originalCloud ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
            color: originalCloud ? '#fcd34d' : '#334155',
          }}>
          <Plus size={12} /> 添加密度直方图
        </button>

        {/* Bottom padding */}
        <div className="h-4" />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-[10px] font-mono text-slate-700">左键旋转 · 右键平移 · 滚轮缩放</span>
      </div>
    </div>
  );
}
