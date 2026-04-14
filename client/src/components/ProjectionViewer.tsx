/**
 * ProjectionViewer
 * Renders a 2D projection of a point cloud onto a plane.
 * Uses a separate Three.js canvas with orthographic camera.
 * Coordinate system: Z-up (X=East, Y=North, Z=Up)
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
  const frameRef = useRef<number>(0);

  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 200;
    const b = cloud.bounds;
    const maxSize = Math.max(b.size.x, b.size.y, b.size.z, 0.001) * 0.6;
    const aspect = w / h;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x080c14);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();

    // Orthographic camera positioned along the normal to the chosen plane
    const camera = new THREE.OrthographicCamera(
      -maxSize * aspect, maxSize * aspect,
      maxSize, -maxSize,
      -100000, 100000
    );

    // Z-up: place camera looking along the axis perpendicular to the plane
    if (plane === 'xy') {
      // Top-down view: camera above looking down (-Z direction)
      camera.position.set(b.center.x, b.center.y, 100000);
      camera.up.set(0, 1, 0); // Y is "up" in screen
      camera.lookAt(b.center.x, b.center.y, 0);
    } else if (plane === 'xz') {
      // Front view: camera in front looking in -Y direction
      camera.position.set(b.center.x, -100000, b.center.z);
      camera.up.set(0, 0, 1); // Z is "up" in screen
      camera.lookAt(b.center.x, 0, b.center.z);
    } else {
      // Side view (YZ): camera to the right looking in -X direction
      camera.position.set(100000, b.center.y, b.center.z);
      camera.up.set(0, 0, 1); // Z is "up" in screen
      camera.lookAt(0, b.center.y, b.center.z);
    }
    camera.updateProjectionMatrix();

    // Grid
    const gridSize = maxSize * 3;
    const grid = new THREE.GridHelper(gridSize, 20, 0x1a2744, 0x0f1a30);
    if (plane === 'xy') {
      grid.rotation.x = Math.PI / 2;
      grid.position.set(b.center.x, b.center.y, 0);
    } else if (plane === 'xz') {
      // Grid in XZ plane: default GridHelper is in XZ, no rotation needed
      grid.position.set(b.center.x, 0, b.center.z);
    } else {
      // YZ plane
      grid.rotation.z = Math.PI / 2;
      grid.position.set(0, b.center.y, b.center.z);
    }
    scene.add(grid);

    // Point cloud
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(cloud.points.slice(), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(cloud.colors.slice(), 3));
    const material = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: false,
      vertexColors: true,
    });
    scene.add(new THREE.Points(geometry, material));

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

    const updateCamera = () => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      if (nw === 0 || nh === 0) return;
      const na = nw / nh;
      const hw = maxSize * na / zoomRef.current;
      const hh = maxSize / zoomRef.current;
      camera.left   = -hw + panRef.current.x;
      camera.right  =  hw + panRef.current.x;
      camera.top    =  hh + panRef.current.y;
      camera.bottom = -hh + panRef.current.y;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(() => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      if (nw === 0 || nh === 0) return;
      renderer.setSize(nw, nh);
      updateCamera();
    });
    resizeObserver.observe(canvas);

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      const scale = (maxSize * 2) / (canvas.clientHeight || 1) / zoomRef.current;
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
    canvas.addEventListener('contextmenu', e => e.preventDefault());

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

  const planeLabel = {
    xy: 'XY 平面 (俯视 · Z轴向上)',
    xz: 'XZ 平面 (正视 · Z轴向上)',
    yz: 'YZ 平面 (侧视 · Z轴向上)',
  }[plane];

  return (
    <div className="flex flex-col rounded-lg overflow-hidden h-full" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,12,20,0.9)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
          <span className="text-xs font-mono text-slate-300 truncate">{sliceLabel}</span>
          <span className="text-xs font-mono text-slate-600 truncate hidden sm:block">→ {planeLabel}</span>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 ml-2">
          <X size={13} />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full flex-1 block"
        style={{ cursor: 'grab', minHeight: 0 }}
      />
    </div>
  );
}
