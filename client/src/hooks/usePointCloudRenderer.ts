/**
 * usePointCloudRenderer
 * Three.js-based point cloud renderer hook.
 * Design: Dark Universe theme - deep space background, rainbow height coloring.
 *
 * Coordinate system: Z-UP (standard for point clouds / LiDAR / surveying)
 *   X → East / right
 *   Y → North / forward
 *   Z → Up (height)
 *
 * Three.js is Y-up by default, so we set camera.up = (0,0,1) and
 * use a scene rotation to keep Z pointing up visually.
 */

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { PointCloud } from '@/lib/pointCloudParser';
import type { Bbox3D } from '@/lib/spatiallmClient';

interface RendererOptions {
  pointSize?: number;
  backgroundColor?: number;
}

/**
 * Spherical → Cartesian with Z-up convention.
 *   theta: azimuth around Z axis
 *   phi:   elevation above XY plane  (0 = horizontal, π/2 = straight up)
 */
function updateCameraFromSpherical(
  camera: THREE.PerspectiveCamera,
  spherical: { theta: number; phi: number; radius: number },
  target: THREE.Vector3
) {
  const { theta, phi, radius } = spherical;
  // Z-up: x = r·cos(phi)·cos(theta), y = r·cos(phi)·sin(theta), z = r·sin(phi)
  const x = radius * Math.cos(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi) * Math.sin(theta);
  const z = radius * Math.sin(phi);
  camera.position.set(target.x + x, target.y + y, target.z + z);
  camera.up.set(0, 0, 1);
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
  const semanticBoxesGroupRef = useRef<THREE.Group | null>(null);

  // Orbit controls state
  const isMouseDownRef = useRef(false);
  const mouseButtonRef = useRef(0);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cameraLockedRef = useRef(false);
  // phi: elevation angle (0 = horizontal, π/2 = top-down)
  const sphericalRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 6, radius: 5 });
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

    const pointsGroup = new THREE.Group();
    scene.add(pointsGroup);
    pointsGroupRef.current = pointsGroup;

    const helperGroup = new THREE.Group();
    scene.add(helperGroup);
    helperGroupRef.current = helperGroup;

    const slicePlanesGroup = new THREE.Group();
    scene.add(slicePlanesGroup);
    slicePlanesGroupRef.current = slicePlanesGroup;

    const semanticBoxesGroup = new THREE.Group();
    scene.add(semanticBoxesGroup);
    semanticBoxesGroupRef.current = semanticBoxesGroup;

    // Z-up grid: GridHelper lies in XY plane by default (horizontal in Y-up).
    // Rotate it so it lies in the XY plane of our Z-up world.
    const grid = new THREE.GridHelper(10, 20, 0x1a2744, 0x0f1a30);
    grid.rotation.x = Math.PI / 2; // rotate to XY plane (Z-up)
    helperGroup.add(grid);

    // Axes: X=red, Y=green, Z=blue (Z is up)
    const axes = new THREE.AxesHelper(1);
    helperGroup.add(axes);

    // Camera with Z-up
    const camera = new THREE.PerspectiveCamera(
      60,
      (canvas.clientWidth || 800) / (canvas.clientHeight || 600),
      0.001,
      100000
    );
    camera.up.set(0, 0, 1);
    updateCameraFromSpherical(camera, sphericalRef.current, targetRef.current);
    cameraRef.current = camera;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

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

  // Mouse/touch controls (Z-up orbit)
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
        // Left drag: orbit (azimuth + elevation)
        sphericalRef.current.theta -= dx * 0.005;
        sphericalRef.current.phi += dy * 0.005;
        // Clamp elevation: just above horizontal (0.01) to nearly top-down (π/2 - 0.01)
        sphericalRef.current.phi = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, sphericalRef.current.phi));
      } else if (mouseButtonRef.current === 2) {
        // Right drag: pan in XY plane (Z-up)
        const camera = cameraRef.current;
        if (!camera) return;
        const panSpeed = sphericalRef.current.radius * 0.0008;
        // Right vector: perpendicular to camera direction in XY plane
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        const right = new THREE.Vector3(-camDir.y, camDir.x, 0).normalize();
        // Up vector in screen space (projected onto XY plane + Z)
        const up = new THREE.Vector3(0, 0, 1);
        targetRef.current.addScaledVector(right, -dx * panSpeed);
        targetRef.current.addScaledVector(up, dy * panSpeed);
      }

      if (cameraRef.current) {
        updateCameraFromSpherical(cameraRef.current, sphericalRef.current, targetRef.current);
      }
    };

    const onMouseUp = () => { isMouseDownRef.current = false; };

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
      sphericalRef.current.radius = maxSize * 2.2;
      targetRef.current.set(b.center.x, b.center.y, b.center.z);

      // Update helpers
      const helperGroup = helperGroupRef.current;
      if (helperGroup) {
        while (helperGroup.children.length > 0) {
          helperGroup.remove(helperGroup.children[0]);
        }

        // Grid in XY plane (Z-up): place at min Z
        const gridSize = maxSize * 2.5;
        const newGrid = new THREE.GridHelper(gridSize, 20, 0x1a2744, 0x0f1a30);
        newGrid.rotation.x = Math.PI / 2; // lie in XY plane
        newGrid.position.set(b.center.x, b.center.y, b.min.z - maxSize * 0.02);
        helperGroup.add(newGrid);

        // Axes at min corner
        const axes = new THREE.AxesHelper(maxSize * 0.2);
        axes.position.set(b.min.x, b.min.y, b.min.z);
        helperGroup.add(axes);
      }

      if (cameraRef.current) {
        updateCameraFromSpherical(cameraRef.current, sphericalRef.current, targetRef.current);
      }
    }
  }, [pointSize]);

  // Show slice planes (Z-up aware)
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

    const minVal = bounds.min[axis];
    const maxVal = bounds.max[axis];
    const step = (maxVal - minVal) / n;
    const maxSize = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);

    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x4f8ef7,
      transparent: true,
      opacity: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x4f8ef7,
      transparent: true,
      opacity: 0.45,
    });

    for (let i = 1; i < n; i++) {
      const pos = minVal + i * step;
      const geo = new THREE.PlaneGeometry(maxSize * 1.3, maxSize * 1.3);
      const mesh = new THREE.Mesh(geo, planeMat.clone());

      if (axis === 'z') {
        // Horizontal plane (XY plane at height z=pos)
        mesh.rotation.x = Math.PI / 2; // make it horizontal in Z-up
        mesh.position.set(bounds.center.x, bounds.center.y, pos);

        // Outline
        const pts = [
          new THREE.Vector3(bounds.min.x - maxSize * 0.1, bounds.min.y - maxSize * 0.1, pos),
          new THREE.Vector3(bounds.max.x + maxSize * 0.1, bounds.min.y - maxSize * 0.1, pos),
          new THREE.Vector3(bounds.max.x + maxSize * 0.1, bounds.max.y + maxSize * 0.1, pos),
          new THREE.Vector3(bounds.min.x - maxSize * 0.1, bounds.max.y + maxSize * 0.1, pos),
          new THREE.Vector3(bounds.min.x - maxSize * 0.1, bounds.min.y - maxSize * 0.1, pos),
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        group.add(new THREE.Line(lineGeo, lineMat.clone()));
      } else if (axis === 'y') {
        // XZ plane (vertical, perpendicular to Y)
        mesh.rotation.y = Math.PI / 2;
        mesh.rotation.z = Math.PI / 2;
        mesh.position.set(bounds.center.x, pos, bounds.center.z);
      } else {
        // YZ plane (vertical, perpendicular to X)
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

  const setSemanticBoxes = useCallback((boxes: Bbox3D[]) => {
    const group = semanticBoxesGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach(item => item.dispose());
        else material?.dispose();
        const map = !Array.isArray(material) && material && 'map' in material
          ? (material as THREE.SpriteMaterial).map
          : undefined;
        map?.dispose();
      });
    }

    boxes.forEach((box, index) => {
      const [cx, cy, cz] = box.center;
      const [sx, sy, sz] = box.size.map(value => Math.max(Math.abs(value), 0.001)) as [number, number, number];
      const color = new THREE.Color().setHSL((index * 0.17 + 0.76) % 1, 0.78, 0.62);

      // Semi-transparent fill makes the predicted volume readable without hiding points.
      const fillGeometry = new THREE.BoxGeometry(sx, sy, sz);
      const fill = new THREE.Mesh(
        fillGeometry,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }),
      );
      fill.position.set(cx, cy, cz);
      fill.rotation.z = box.rotation?.[2] ?? 0;
      group.add(fill);

      const edgeGeometry = new THREE.EdgesGeometry(fillGeometry);
      const edges = new THREE.LineSegments(
        edgeGeometry,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }),
      );
      edges.position.copy(fill.position);
      edges.rotation.copy(fill.rotation);
      group.add(edges);

      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 512;
      labelCanvas.height = 96;
      const context = labelCanvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        context.fillStyle = `#${color.getHexString()}`;
        context.globalAlpha = 0.94;
        context.fillRect(4, 4, labelCanvas.width - 8, labelCanvas.height - 8);
        context.globalAlpha = 1;
        context.fillStyle = '#07101e';
        context.font = 'bold 34px Space Grotesk, Arial, sans-serif';
        context.textBaseline = 'middle';
        const confidence = typeof box.confidence === 'number' ? `  ${(box.confidence * 100).toFixed(0)}%` : '';
        context.fillText(`${box.label}${confidence}`, 18, labelCanvas.height / 2);
      }
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      labelTexture.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthTest: false }));
      const labelScale = Math.max(sx, sy, sz) * 0.55;
      label.scale.set(labelScale * 2.7, labelScale * 0.5, 1);
      label.position.set(cx, cy, cz + sz / 2 + Math.max(sz * 0.08, 0.02));
      group.add(label);
    });
  }, []);

  const setPointSize = useCallback((size: number) => {
    const group = pointsGroupRef.current;
    if (!group) return;
    group.children.forEach(child => {
      if (child instanceof THREE.Points) {
        (child.material as THREE.PointsMaterial).size = size;
      }
    });
  }, []);

  const setCameraLocked = useCallback((locked: boolean) => {
    cameraLockedRef.current = locked;
  }, []);

  const resetCamera = useCallback(() => {
    sphericalRef.current.theta = Math.PI / 4;
    sphericalRef.current.phi = Math.PI / 6;
    if (cameraRef.current) {
      updateCameraFromSpherical(cameraRef.current, sphericalRef.current, targetRef.current);
    }
  }, []);

  // Set view direction (Z-up)
  const setView = useCallback((view: 'front' | 'top' | 'side' | 'iso') => {
    switch (view) {
      case 'front':
        // Looking from +Y toward -Y, Z is up
        sphericalRef.current.theta = -Math.PI / 2;
        sphericalRef.current.phi = 0;
        break;
      case 'top':
        // Looking straight down from +Z
        sphericalRef.current.theta = 0;
        sphericalRef.current.phi = Math.PI / 2 - 0.02;
        break;
      case 'side':
        // Looking from +X toward -X
        sphericalRef.current.theta = 0;
        sphericalRef.current.phi = 0;
        break;
      case 'iso':
        sphericalRef.current.theta = Math.PI / 4;
        sphericalRef.current.phi = Math.PI / 6;
        break;
    }
    if (cameraRef.current) {
      updateCameraFromSpherical(cameraRef.current, sphericalRef.current, targetRef.current);
    }
  }, []);

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
    setSemanticBoxes,
    sceneRef,
    cameraRef,
    rendererRef,
  };
}
