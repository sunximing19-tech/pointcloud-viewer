/**
 * SampleDataLoader
 * Provides a quick way to load sample point cloud data for demonstration.
 */

import { useState } from 'react';
import { usePointCloud } from '@/contexts/PointCloudContext';
import { parsePointCloud } from '@/lib/pointCloudParser';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

function generateSampleCloud(): string {
  const lines: string[] = [];
  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  // Sphere
  for (let i = 0; i < 2000; i++) {
    const theta = rand(0, 2 * Math.PI);
    const phi = rand(0, Math.PI);
    const r = 5 + (Math.random() - 0.5) * 0.3;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    lines.push(`${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
  }

  // Ground plane
  for (let i = 0; i < 1500; i++) {
    const x = rand(-8, 8);
    const y = rand(-8, 8);
    const z = -5 + (Math.random() - 0.5) * 0.1;
    lines.push(`${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
  }

  // Vertical cylinder
  for (let i = 0; i < 800; i++) {
    const theta = rand(0, 2 * Math.PI);
    const r = 1 + (Math.random() - 0.5) * 0.1;
    const x = r * Math.cos(theta) + 6;
    const y = r * Math.sin(theta);
    const z = rand(-5, 5);
    lines.push(`${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
  }

  // Diagonal ramp
  for (let i = 0; i < 700; i++) {
    const x = rand(-6, 0);
    const y = rand(-2, 2);
    const z = x * 0.5 + (Math.random() - 0.5) * 0.2;
    lines.push(`${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
  }

  return lines.join('\n');
}

export default function SampleDataLoader() {
  const [loading, setLoading] = useState(false);
  const { loadCloud } = usePointCloud();

  const handleLoad = () => {
    setLoading(true);
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const text = generateSampleCloud();
        const cloud = parsePointCloud(text);
        loadCloud(cloud, 'sample_scene.txt');
        toast.success(`已加载示例点云 (${cloud.count.toLocaleString()} pts)`, {
          description: '球体 + 地面 + 圆柱 + 斜坡',
        });
      } catch (e) {
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    }, 50);
  };

  return (
    <button
      onClick={handleLoad}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 mt-1"
      style={{
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.2)',
        color: '#6ee7b7',
      }}
    >
      <Sparkles size={11} />
      {loading ? '生成中...' : '加载示例数据'}
    </button>
  );
}
