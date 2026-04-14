/**
 * Point Cloud Parser
 * Parses TXT format point cloud files.
 * Supports formats: "x y z", "x y z r g b", "x y z intensity", etc.
 */

export interface Point {
  x: number;
  y: number;
  z: number;
  r?: number;
  g?: number;
  b?: number;
  intensity?: number;
}

export interface PointCloud {
  points: Float32Array; // [x, y, z, x, y, z, ...]
  colors: Float32Array; // [r, g, b, r, g, b, ...]
  count: number;
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
    center: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
  };
}

/**
 * Height-based rainbow colormap: blue -> cyan -> green -> yellow -> red
 */
export function heightToColor(t: number): [number, number, number] {
  // t in [0, 1]
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  t = clamp(t);

  let r = 0, g = 0, b = 0;

  if (t < 0.25) {
    // blue -> cyan
    const s = t / 0.25;
    r = 0;
    g = s;
    b = 1;
  } else if (t < 0.5) {
    // cyan -> green
    const s = (t - 0.25) / 0.25;
    r = 0;
    g = 1;
    b = 1 - s;
  } else if (t < 0.75) {
    // green -> yellow
    const s = (t - 0.5) / 0.25;
    r = s;
    g = 1;
    b = 0;
  } else {
    // yellow -> red
    const s = (t - 0.75) / 0.25;
    r = 1;
    g = 1 - s;
    b = 0;
  }

  return [r, g, b];
}

export function parsePointCloud(text: string): PointCloud {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Skip header lines that don't start with numbers
  const dataLines = lines.filter(line => {
    const first = line.trim().split(/[\s,]+/)[0];
    return !isNaN(parseFloat(first));
  });

  if (dataLines.length === 0) {
    throw new Error('No valid point data found in file');
  }

  const rawPoints: number[][] = [];
  let hasRGB = false;

  for (const line of dataLines) {
    const parts = line.trim().split(/[\s,;]+/).map(Number);
    if (parts.length >= 3 && parts.every(p => !isNaN(p))) {
      rawPoints.push(parts);
      if (parts.length >= 6) hasRGB = true;
    }
  }

  const count = rawPoints.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  // Compute bounds
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const p of rawPoints) {
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[2] < minZ) minZ = p[2];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] > maxY) maxY = p[1];
    if (p[2] > maxZ) maxZ = p[2];
  }

  const rangeZ = maxZ - minZ || 1;

  for (let i = 0; i < count; i++) {
    const p = rawPoints[i];
    positions[i * 3] = p[0];
    positions[i * 3 + 1] = p[1];
    positions[i * 3 + 2] = p[2];

    if (hasRGB && p.length >= 6) {
      // Check if RGB is 0-255 or 0-1
      const maxVal = Math.max(p[3], p[4], p[5]);
      const scale = maxVal > 1 ? 255 : 1;
      colors[i * 3] = p[3] / scale;
      colors[i * 3 + 1] = p[4] / scale;
      colors[i * 3 + 2] = p[5] / scale;
    } else {
      // Height-based rainbow coloring
      const t = (p[2] - minZ) / rangeZ;
      const [r, g, b] = heightToColor(t);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  return {
    points: positions,
    colors,
    count,
    bounds: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      center: { x: cx, y: cy, z: cz },
      size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
    },
  };
}

/**
 * Split point cloud into slices along an axis
 * axis: 'x' | 'y' | 'z'
 * n: number of slices
 * Returns array of { points, colors, count, sliceIndex, bounds }
 */
export interface PointCloudSlice {
  points: Float32Array;
  colors: Float32Array;
  count: number;
  sliceIndex: number;
  bounds: PointCloud['bounds'];
}

export function splitPointCloud(
  cloud: PointCloud,
  axis: 'x' | 'y' | 'z',
  n: number
): PointCloudSlice[] {
  if (n <= 1) {
    return [{
      points: cloud.points,
      colors: cloud.colors,
      count: cloud.count,
      sliceIndex: 0,
      bounds: cloud.bounds,
    }];
  }

  const axisIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const minVal = cloud.bounds.min[axis];
  const maxVal = cloud.bounds.max[axis];
  const range = maxVal - minVal;
  const step = range / n;

  // Bucket points
  const buckets: number[][] = Array.from({ length: n }, () => []);

  for (let i = 0; i < cloud.count; i++) {
    const val = cloud.points[i * 3 + axisIdx];
    let bucket = Math.floor((val - minVal) / step);
    if (bucket >= n) bucket = n - 1;
    if (bucket < 0) bucket = 0;
    buckets[bucket].push(i);
  }

  return buckets.map((indices, sliceIndex) => {
    const count = indices.length;
    const points = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    let localMinX = Infinity, localMinY = Infinity, localMinZ = Infinity;
    let localMaxX = -Infinity, localMaxY = -Infinity, localMaxZ = -Infinity;

    for (let j = 0; j < count; j++) {
      const srcIdx = indices[j];
      const x = cloud.points[srcIdx * 3];
      const y = cloud.points[srcIdx * 3 + 1];
      const z = cloud.points[srcIdx * 3 + 2];
      points[j * 3] = x;
      points[j * 3 + 1] = y;
      points[j * 3 + 2] = z;
      colors[j * 3] = cloud.colors[srcIdx * 3];
      colors[j * 3 + 1] = cloud.colors[srcIdx * 3 + 1];
      colors[j * 3 + 2] = cloud.colors[srcIdx * 3 + 2];

      if (x < localMinX) localMinX = x;
      if (y < localMinY) localMinY = y;
      if (z < localMinZ) localMinZ = z;
      if (x > localMaxX) localMaxX = x;
      if (y > localMaxY) localMaxY = y;
      if (z > localMaxZ) localMaxZ = z;
    }

    if (count === 0) {
      localMinX = localMinY = localMinZ = 0;
      localMaxX = localMaxY = localMaxZ = 0;
    }

    return {
      points,
      colors,
      count,
      sliceIndex,
      bounds: {
        min: { x: localMinX, y: localMinY, z: localMinZ },
        max: { x: localMaxX, y: localMaxY, z: localMaxZ },
        center: {
          x: (localMinX + localMaxX) / 2,
          y: (localMinY + localMaxY) / 2,
          z: (localMinZ + localMaxZ) / 2,
        },
        size: {
          x: localMaxX - localMinX,
          y: localMaxY - localMinY,
          z: localMaxZ - localMinZ,
        },
      },
    };
  });
}

/**
 * Project point cloud onto a plane
 * plane: 'xy' | 'xz' | 'yz'
 * Returns new point cloud with points projected
 */
export function projectPointCloud(
  cloud: PointCloud | PointCloudSlice,
  plane: 'xy' | 'xz' | 'yz'
): PointCloud {
  const count = cloud.count;
  const projected = new Float32Array(count * 3);
  const colors = new Float32Array(cloud.colors);

  for (let i = 0; i < count; i++) {
    const x = cloud.points[i * 3];
    const y = cloud.points[i * 3 + 1];
    const z = cloud.points[i * 3 + 2];

    if (plane === 'xy') {
      projected[i * 3] = x;
      projected[i * 3 + 1] = y;
      projected[i * 3 + 2] = 0;
    } else if (plane === 'xz') {
      projected[i * 3] = x;
      projected[i * 3 + 1] = 0;
      projected[i * 3 + 2] = z;
    } else {
      // yz
      projected[i * 3] = 0;
      projected[i * 3 + 1] = y;
      projected[i * 3 + 2] = z;
    }
  }

  const b = cloud.bounds;
  return {
    points: projected,
    colors,
    count,
    bounds: b,
  };
}
