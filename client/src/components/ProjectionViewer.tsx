/**
 * ProjectionViewer
 * Renders a 2D projection of a point cloud onto a plane.
 * Uses a separate Three.js canvas with orthographic camera.
 */

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { PointCloud } from '@/lib/pointCloudParser';
import type { ProjectionPlane } from '@/contexts/PointCloudContext';
import { X } from 'lucide-react';

interface ProjectionViewerProps {
  id: string;
  cloud: PointCloud;
  plane: ProjectionPlane;
  sliceLabel: string;
  onClose: () => void;
}

export default function ProjectionViewer({ id, cloud, plane, sliceLabel, onClose }: ProjectionViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const frameRef = useRef<number>(0);

  // Pan/zoom state
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 240;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.setClearColor(0x080c14);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Orthographic camera
    const aspect = w / h;
    const b = cloud.bounds;
    const maxSize = Math.max(b.size.x, b.size.y, b.size.z) * 0.6;
    const camera = new THREE.OrthographicCamera(
      -maxSize * aspect, maxSize * aspect,
      maxSize, -maxSize,
      -10000, 10000
    );

    // Set camera position based on plane
    if (plane === 'xy') {
      camera.position.set(b.center.x, b.center.y, 1000);
      camera.lookAt(b.center.x, b.center.y, 0);
    } else if (plane === 'xz') {
      camera.position.set(b.center.x, 1000, b.center.z);
      camera.lookAt(b.center.x, 0, b.center.z);
    } else {
      camera.position.set(1000, b.center.y, b.center.z);
      camera.lookAt(0, b.center.y, b.center.z);
    }
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    // Add grid
    const gridSize = maxSize * 3;
    const grid = new THREE.GridHelper(gridSize, 20, 0x1a2744, 0x0f1a30);
    if (plane === 'xy') {
      grid.rotation.x = Math.PI / 2;
      grid.position.set(b.center.x, b.center.y, 0);
    } else if (plane === 'xz') {
      grid.position.set(b.center.x, 0, b.center.z);
    } else {
      grid.rotation.z = Math.PI / 2;
      grid.position.set(0, b.center.y, b.center.z);
    }
    scene.add(grid);

    // Add point cloud
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(cloud.points, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(cloud.colors, 3));
    const material = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: false,
      vertexColors: true,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Axes
    const axes = new THREE.AxesHelper(maxSize * 0.3);
    if (plane === 'xy') axes.position.set(b.min.x, b.min.y, 0);
    else if (plane === 'xz') axes.position.set(b.min.x, 0, b.min.z);
    else axes.position.set(0, b.min.y, b.min.z);
    scene.add(axes);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      if (nw === 0 || nh === 0) return;
      renderer.setSize(nw, nh);
      const na = nw / nh;
      camera.left = -maxSize * na / zoomRef.current + panRef.current.x;
      camera.right = maxSize * na / zoomRef.current + panRef.current.x;
      camera.top = maxSize / zoomRef.current + panRef.current.y;
      camera.bottom = -maxSize / zoomRef.current + panRef.current.y;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvas);

    // Pan/zoom handlers
    const updateCamera = () => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      const na = nw / nh;
      camera.left = -maxSize * na / zoomRef.current + panRef.current.x;
      camera.right = maxSize * na / zoomRef.current + panRef.current.x;
      camera.top = maxSize / zoomRef.current + panRef.current.y;
      camera.bottom = -maxSize / zoomRef.current + panRef.current.y;
      camera.updateProjectionMatrix();
    };

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      const scale = (maxSize * 2) / canvas.clientHeight / zoomRef.current;
      panRef.current.x -= dx * scale;
      panRef.current.y += dy * scale;
      updateCamera();
    };
    const onMouseUp = () => { isDraggingRef.current = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current *= e.deltaY > 0 ? 0.9 : 1.1;
      zoomRef.current = Math.max(0.1, Math.min(50, zoomRef.current));
      updateCamera();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [cloud, plane]);

  const planeLabel = { xy: 'XY 平面 (俯视)', xz: 'XZ 平面 (正视)', yz: 'YZ 平面 (侧视)' }[plane];

  return (
    <div className="flex flex-col rounded-lg overflow-hidden border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm" style={{ minWidth: 280, minHeight: 220 }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span className="text-xs font-mono text-slate-300">{sliceLabel}</span>
          <span className="text-xs font-mono text-slate-500">→ {planeLabel}</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-red-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full flex-1"
        style={{ minHeight: 180, cursor: 'grab' }}
      />
    </div>
  );
}
