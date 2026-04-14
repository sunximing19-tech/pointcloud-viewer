/**
 * DensityHistogramViewer
 * Renders a 2D point density histogram using Canvas 2D API.
 * Color: low density = dark blue, high density = bright yellow/white (hot colormap)
 * Design: Dark Universe theme.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import type { DensityHistogram } from '@/lib/densityHistogram';
import type { HistogramAxis } from '@/lib/densityHistogram';
import { X, RefreshCw } from 'lucide-react';

interface DensityHistogramViewerProps {
  id: string;
  histogram: DensityHistogram;
  sliceLabel: string;
  onClose: () => void;
  onRecompute?: () => void;
}

/** Hot colormap: black → blue → cyan → green → yellow → white */
function hotColor(t: number): string {
  // t in [0,1]
  t = Math.max(0, Math.min(1, t));
  let r = 0, g = 0, b = 0;
  if (t < 0.2) {
    // black → blue
    const s = t / 0.2;
    r = 0; g = 0; b = s;
  } else if (t < 0.4) {
    // blue → cyan
    const s = (t - 0.2) / 0.2;
    r = 0; g = s; b = 1;
  } else if (t < 0.6) {
    // cyan → green
    const s = (t - 0.4) / 0.2;
    r = 0; g = 1; b = 1 - s;
  } else if (t < 0.8) {
    // green → yellow
    const s = (t - 0.6) / 0.2;
    r = s; g = 1; b = 0;
  } else {
    // yellow → white
    const s = (t - 0.8) / 0.2;
    r = 1; g = 1; b = s;
  }
  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(b * 255);
  return `rgb(${ri},${gi},${bi})`;
}

const AXIS_LABEL: Record<HistogramAxis, string> = { x: 'X', y: 'Y', z: 'Z' };

export default function DensityHistogramViewer({
  id,
  histogram,
  sliceLabel,
  onClose,
  onRecompute,
}: DensityHistogramViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const PAD = { left: 48, right: 16, top: 12, bottom: 40 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, W, H);

    // Plot area background
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(PAD.left, PAD.top, plotW, plotH);

    const { cells, maxCount, uBins, vBins, uMin, uMax, vMin, vMax, uAxis, vAxis, cellSize } = histogram;
    if (maxCount === 0 || cells.length === 0) {
      ctx.fillStyle = '#334155';
      ctx.font = '12px Space Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('无数据', W / 2, H / 2);
      return;
    }

    const cellW = plotW / uBins;
    const cellH = plotH / vBins;

    // Draw cells
    for (const cell of cells) {
      const t = Math.pow(cell.count / maxCount, 0.5); // sqrt scale for better contrast
      const color = hotColor(t);
      const cx = PAD.left + cell.u * cellW;
      const cy = PAD.top + (vBins - 1 - cell.v) * cellH; // flip V so bottom = min
      ctx.fillStyle = color;
      ctx.fillRect(cx, cy, Math.ceil(cellW), Math.ceil(cellH));
    }

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    const gridStep = Math.max(1, Math.floor(uBins / 10));
    for (let u = 0; u <= uBins; u += gridStep) {
      const x = PAD.left + u * cellW;
      ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + plotH); ctx.stroke();
    }
    const gridStepV = Math.max(1, Math.floor(vBins / 10));
    for (let v = 0; v <= vBins; v += gridStepV) {
      const y = PAD.top + v * cellH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + plotW, y); ctx.stroke();
    }

    // Border
    ctx.strokeStyle = 'rgba(79,142,247,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD.left, PAD.top, plotW, plotH);

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Space Mono, monospace';
    ctx.textAlign = 'center';

    // X axis (U)
    const uRange = uMax - uMin;
    const uTicks = 5;
    for (let i = 0; i <= uTicks; i++) {
      const val = uMin + (i / uTicks) * uRange;
      const x = PAD.left + (i / uTicks) * plotW;
      ctx.fillText(val.toFixed(1), x, PAD.top + plotH + 14);
    }
    ctx.fillStyle = '#4f8ef7';
    ctx.font = '11px Space Grotesk, sans-serif';
    ctx.fillText(AXIS_LABEL[uAxis], PAD.left + plotW / 2, H - 4);

    // Y axis (V)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Space Mono, monospace';
    const vRange = vMax - vMin;
    const vTicks = 4;
    for (let i = 0; i <= vTicks; i++) {
      const val = vMin + (i / vTicks) * vRange;
      const y = PAD.top + plotH - (i / vTicks) * plotH;
      ctx.fillText(val.toFixed(1), PAD.left - 4, y + 3);
    }
    ctx.save();
    ctx.translate(12, PAD.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#4f8ef7';
    ctx.font = '11px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(AXIS_LABEL[vAxis], 0, 0);
    ctx.restore();

    // Color scale bar (right side)
    const barX = W - PAD.right + 2;
    const barW = 8;
    const barH = plotH;
    const barY = PAD.top;
    for (let i = 0; i < barH; i++) {
      const t = 1 - i / barH;
      ctx.fillStyle = hotColor(t);
      ctx.fillRect(barX, barY + i, barW, 1);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#475569';
    ctx.font = '9px Space Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${maxCount}`, barX + barW + 2, barY + 8);
    ctx.fillText('0', barX + barW + 2, barY + barH);

  }, [histogram]);

  // Redraw on resize or data change
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w;
      canvas.height = h;
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  // Tooltip on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const W = canvas.width;
    const H = canvas.height;
    const PAD = { left: 48, right: 16, top: 12, bottom: 40 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    if (mx < PAD.left || mx > PAD.left + plotW || my < PAD.top || my > PAD.top + plotH) {
      setTooltip(null);
      return;
    }

    const { uBins, vBins, uMin, uMax, vMin, vMax, uAxis, vAxis } = histogram;
    const cu = Math.floor(((mx - PAD.left) / plotW) * uBins);
    const cv = vBins - 1 - Math.floor(((my - PAD.top) / plotH) * vBins);
    const cell = histogram.cells.find(c => c.u === cu && c.v === cv);
    const count = cell?.count ?? 0;

    const uVal = uMin + (cu / uBins) * (uMax - uMin);
    const vVal = vMin + (cv / vBins) * (vMax - vMin);

    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 30,
      text: `${AXIS_LABEL[uAxis]}=${uVal.toFixed(2)}, ${AXIS_LABEL[vAxis]}=${vVal.toFixed(2)}: ${count} pts`,
    });
  }, [histogram]);

  const projLabel = `投影轴: ${AXIS_LABEL[histogram.projAxis]}`;

  return (
    <div className="flex flex-col rounded-lg overflow-hidden h-full" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,12,20,0.9)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
          <span className="text-xs font-mono text-slate-300 truncate">{sliceLabel}</span>
          <span className="text-xs font-mono text-slate-600 truncate hidden sm:block">密度图 · {projLabel}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' }}>
            格:{histogram.cellSize.toFixed(3)}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          {onRecompute && (
            <button onClick={onRecompute} className="text-slate-600 hover:text-blue-400 transition-colors p-0.5" title="重新计算">
              <RefreshCw size={11} />
            </button>
          )}
          <button onClick={onClose} className="text-slate-600 hover:text-red-400 transition-colors p-0.5">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative min-h-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />
        {tooltip && (
          <div
            className="absolute pointer-events-none px-2 py-1 rounded text-[10px] font-mono text-slate-200 z-10"
            style={{
              left: tooltip.x + 8,
              top: tooltip.y,
              background: 'rgba(15,23,42,0.92)',
              border: '1px solid rgba(79,142,247,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-1 flex-shrink-0 flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-[10px] font-mono text-slate-600">
          格网: {histogram.uBins}×{histogram.vBins}
        </span>
        <span className="text-[10px] font-mono text-slate-600">
          中位NN: {histogram.medianNN.toFixed(4)}
        </span>
        <span className="text-[10px] font-mono text-slate-600">
          最大密度: {histogram.maxCount}
        </span>
      </div>
    </div>
  );
}
