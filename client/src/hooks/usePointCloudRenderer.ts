/**
 * usePointCloudRenderer
 * Three.js-based point cloud renderer hook.
 * Design: Dark Universe theme - deep space background, rainbow height coloring.
 * Features: orbit controls, point size, grid/axes, slice planes visualization.
 */

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { PointCloud } from '@/lib/pointCloudParser';

interface RendererOptions {
  pointSize?: number;
  backgroundColor?: number;
}

function updateCameraFromSpherical(
  camera: THREE.PerspectiveCamera,
  spherical: { theta: number; phi: number; radius: number },
  target: THREE.Vector3
) {
  const { theta, phi, radius } = spherical;
  const x = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.cos(theta);
  camera.position.set(target.x + x, target.y + y, target.z + z);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

export function usePointCloudRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: RendererOptions = {}
) {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const pointsGroupRef = useRef<THREE.Group | null>(null);
  const helperGroupRef = useRef<THREE.Group | null>(null);
  const slicePlanesGroupRef = useRef<THREE.Group | null>(null);

  // Orbit controls state
  const isMouseDownRef = useRef(false);
  const mouseButtonRef = useRef(0);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cameraLockedRef = useRef(false);
  const sphericalRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 5 });
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));

  const { pointSize = 2, backgroundColor = 0x080c14 } = options;

  // Initialize Three.js scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600);
    renderer.setClearColor(backgroundColor);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Groups for organized scene management
    const pointsGroup = new THREE.Group();
    scene.add(pointsGroup);
    pointsGroupRef.current = pointsGroup;

    const helperGroup = new THREE.Group();
    scene.add(helperGroup);
    helperGroupRef.current = helperGroup;

    const slicePlanesGroup = new THREE.Group();
    scene.add(slicePlanesGroup);
    slicePlanesGroupRef.current = slicePlanesGroup;

    // Add subtle grid
    const grid = new THREE.GridHelper(10, 20, 0x1a2744, 0x0f1a30);
    helperGroup.add(grid);

    // Add axes helper
    const axes = new THREE.AxesHelper(1);
    helperGroup.add(axes);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      (canvas.clientWidth || 800) / (canvas.clientHeight || 600),
      0.001,
      100000
    );
    updateCameraFromSpherical(camera, sphericalRef.current, targetRef.current);
    cameraRef.current = camera;

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, [canvasRef, backgroundColor]);

  // Mouse/touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      if (cameraLockedRef.current) return;
      isMouseDownRef.current = true;
      mouseButtonRef.current = e.button;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current || cameraLockedRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      if (mouseButtonRef.current === 0) {
        // Left drag: rotate
        sphericalRef.current.theta -= dx * 0.005;
        sphericalRef.current.phi -= dy * 0.005;
        sphericalRef.current.phi = Math.max(0.02, Math.min(Math.PI - 0.02, sphericalRef.current.phi));
      } else if (mouseButtonRef.current === 2) {
        // Right drag: pan
        const camera = cameraRef.current;
        if (!camera) return;
        const panSpeed = sphericalRef.current.radius * 0.0008;
        const right = new THREE.Vector3();
        camera.getWorldDirection(right);
        right.cross(camera.up).normalize();
        const up = camera.up.clone();
        targetRef.current.addScaledVector(right, -dx * panSpeed);
        targetRef.current.addScaledVector(up, dy * panSpeed);
      }

      if (cameraRef.current) {
        updateCameraFromSpherical(cameraRef.current, sphericalRef.current, targetRef.current);
      }
    };

    const onMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (cameraLockedRef.current) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.12 : 0.88;
      sphericalRef.current.radius = Math.max(0.001, Math.min(100000, sphericalRef.current.radius * factor));
      if (cameraRef.current) {
        updateCameraFromSpherical(cameraRef.current, sphericalRef.current, targetRef.current);
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [canvasRef]);

  // Load point cloud data into scene
  const loadPointCloud = useCallback((clouds: PointCloud[], clearExisting = true) => {
    const scene = sceneRef.current;
    const group = pointsGroupRef.current;
    if (!scene || !group) return;

    if (clearExisting) {
      while (group.children.length > 0) {
        const child = group.children[0] as THREE.Points;
        group.remove(child);
        child.geometry?.dispose();
        (child.material as THREE.Material)?.dispose();
      }
    }

    clouds.forEach((cloud) => {
      if (cloud.count === 0) return;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(cloud.points.slice(), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(cloud.colors.slice(), 3));

      const material = new THREE.PointsMaterial({
        size: pointSize,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: false,
      });

      const points = new THREE.Points(geometry, material);
      group.add(points);
    });

    // Auto-fit camera to first cloud
    if (clouds.length > 0 && clouds[0].count > 0) {
      const b = clouds[0].bounds;
      const maxSize = Math.max(b.size.x, b.size.y, b.size.z, 0.001);
      sphericalRef.current.radius = maxSize * 2.0;
      targetRef.current.set(b.center.x, b.center.y, b.center.z);

      // Update helpers
      const helperGroup = helperGroupRef.current;
      if (helperGroup) {
        while (helperGroup.children.length > 0) {
          helperGroup.remove(helperGroup.children[0]);
        }

        const gridSize = maxSize * 2.5;
        const newGrid = new THREE.GridHelper(gridSize, 20, 0x1a2744, 0x0f1a30);
        newGrid.position.set(b.center.x, b.min.y - maxSize * 0.02, b.center.z);
        helperGroup.add(newGrid);

        const axes = new THREE.AxesHelper(maxSize * 0.2);
        axes.position.set(b.min.x, b.min.y, b.min.z);
        helperGroup.add(axes);
      }

      if (cameraRef.current) {
        updateCameraFromSpherical(cameraRef.current, sphericalRef.current, targetRef.current);
      }
    }
  }, [pointSize]);

  // Show slice planes
  const showSlicePlanes = useCallback((
    axis: 'x' | 'y' | 'z',
    n: number,
    bounds: PointCloud['bounds']
  ) => {
    const group = slicePlanesGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      child.geometry?.dispose();
      (child.material as THREE.Material)?.dispose();
    }

    const axisIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const minVal = bounds.min[axis];
    const maxVal = bounds.max[axis];
    const step = (maxVal - minVal) / n;
    const maxSize = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);

    for (let i = 1; i < n; i++) {
      const pos = minVal + i * step;
      let geometry: THREE.PlaneGeometry;
      let mesh: THREE.Mesh;

      const planeMat = new THREE.MeshBasicMaterial({
        color: 0x4f8ef7,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const lineMat = new THREE.LineBasicMaterial({
        color: 0x4f8ef7,
        transparent: true,
        opacity: 0.4,
      });

      if (axis === 'z') {
        geometry = new THREE.PlaneGeometry(maxSize * 1.2, maxSize * 1.2);
        mesh = new THREE.Mesh(geometry, planeMat);
        mesh.position.set(bounds.center.x, bounds.center.y, pos);

        // Line
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(bounds.min.x - maxSize * 0.1, bounds.min.y - maxSize * 0.1, pos),
          new THREE.Vector3(bounds.max.x + maxSize * 0.1, bounds.min.y - maxSize * 0.1, pos),
          new THREE.Vector3(bounds.max.x + maxSize * 0.1, bounds.max.y + maxSize * 0.1, pos),
          new THREE.Vector3(bounds.min.x - maxSize * 0.1, bounds.max.y + maxSize * 0.1, pos),
          new THREE.Vector3(bounds.min.x - maxSize * 0.1, bounds.min.y - maxSize * 0.1, pos),
        ]);
        const line = new THREE.Line(lineGeo, lineMat);
        group.add(line);
      } else if (axis === 'y') {
        geometry = new THREE.PlaneGeometry(maxSize * 1.2, maxSize * 1.2);
        mesh = new THREE.Mesh(geometry, planeMat);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(bounds.center.x, pos, bounds.center.z);
      } else {
        geometry = new THREE.PlaneGeometry(maxSize * 1.2, maxSize * 1.2);
        mesh = new THREE.Mesh(geometry, planeMat);
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(pos, bounds.center.y, bounds.center.z);
      }

      group.add(mesh);
    }
  }, []);

  const clearSlicePlanes = useCallback(() => {
    const group = slicePlanesGroupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      child.geometry?.dispose();
      (child.material as THREE.Material)?.dispose();
    }
  }, []);

  // Update point size
  const setPointSize = useCallback((size: number) => {
    const group = pointsGroupRef.current;
    if (!group) return;
    group.children.forEach(child => {
      if (child instanceof THREE.Points) {
        (child.material as THREE.PointsMaterial).size = size;
      }
    });
  }, []);

  // Lock/unlock camera
  const setCameraLocked = useCallback((locked: boolean) => {
    cameraLockedRef.current = locked;
  }, []);

  // Reset camera view
  const resetCamera = useCallback(() => {
    sphericalRef.current.theta = Math.PI / 4;
    sphericalRef.current.phi = Math.PI / 3;
    if (cameraRef.current) {
      updateCameraFromSpherical(cameraRef.current, sphericalRef.current, targetRef.current);
    }
  }, []);

  // Set view direction
  const setView = useCallback((view: 'front' | 'top' | 'side' | 'iso') => {
    switch (view) {
      case 'front':
        sphericalRef.current.theta = 0;
        sphericalRef.current.phi = Math.PI / 2;
        break;
      case 'top':
        sphericalRef.current.theta = 0;
        sphericalRef.current.phi = 0.02;
        break;
      case 'side':
        sphericalRef.current.theta = Math.PI / 2;
        sphericalRef.current.phi = Math.PI / 2;
        break;
      case 'iso':
        sphericalRef.current.theta = Math.PI / 4;
        sphericalRef.current.phi = Math.PI / 3;
        break;
    }
    if (cameraRef.current) {
      updateCameraFromSpherical(cameraRef.current, sphericalRef.current, targetRef.current);
    }
  }, []);

  // Toggle helpers visibility
  const setHelpersVisible = useCallback((grid: boolean, axes: boolean) => {
    const helperGroup = helperGroupRef.current;
    if (!helperGroup) return;
    helperGroup.children.forEach(child => {
      if (child instanceof THREE.GridHelper) child.visible = grid;
      if (child instanceof THREE.AxesHelper) child.visible = axes;
    });
  }, []);

  return {
    loadPointCloud,
    setPointSize,
    setCameraLocked,
    resetCamera,
    setView,
    setHelpersVisible,
    showSlicePlanes,
    clearSlicePlanes,
    sceneRef,
    cameraRef,
    rendererRef,
  };
}
