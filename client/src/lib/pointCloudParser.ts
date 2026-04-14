/**
 * Point Cloud Parser
 * Parses TXT format point cloud files.
 * Supports formats: "x y z", "x y z r g b", "x y z intensity", etc.
 *
 * Large-file strategy:
 *   - Streaming chunk-based parse: never builds a full line array or 2D number array.
 *   - Two-pass approach:
 *       Pass 1: scan for bounds + count (minimal memory: just 6 floats + counter)
 *       Pass 2: fill pre-allocated Float32Arrays
 *   - Each pass processes the text in fixed-size chunks to avoid string allocation spikes.
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

export interface PointCloudSlice {
  points: Float32Array;
  colors: Float32Array;
  count: number;
  sliceIndex: number;
  bounds: PointCloud['bounds'];
}

/**
 * Height-based rainbow colormap: blue -> cyan -> green -> yellow -> red
 */
export function heightToColor(t: number): [number, number, number] {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  t = clamp(t);
  let r = 0, g = 0, b = 0;
  if (t < 0.25) {
    const s = t / 0.25; r = 0; g = s; b = 1;
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25; r = 0; g = 1; b = 1 - s;
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25; r = s; g = 1; b = 0;
  } else {
    const s = (t - 0.75) / 0.25; r = 1; g = 1 - s; b = 0;
  }
  return [r, g, b];
}

/**
 * Iterate lines of a text block, calling callback for each non-empty line.
 * Avoids building a full line array.
 */
function forEachLine(text: string, cb: (line: string) => void): void {
  let start = 0;
  const len = text.length;
  while (start < len) {
    let end = text.indexOf('\n', start);
    if (end === -1) end = len;
    if (end > start) cb(text.slice(start, end));
    start = end + 1;
  }
}

/** Parse a single line into numeric fields, returns null if invalid */
function parseLine(line: string): number[] | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;
  // Quick check: first char must be digit, '-', or '+'
  const fc = trimmed.charCodeAt(0);
  if (fc !== 45 && fc !== 43 && (fc < 48 || fc > 57)) return null;

  const parts = trimmed.split(/[\s,;]+/);
  if (parts.length < 3) return null;

  const nums: number[] = [];
  for (const p of parts) {
    const n = +p; // faster than parseFloat for well-formed numbers
    if (isNaN(n)) return null;
    nums.push(n);
  }
  return nums.length >= 3 ? nums : null;
}

/**
 * Main parser — two-pass streaming, O(1) extra memory beyond output arrays.
 */
export function parsePointCloud(text: string): PointCloud {
  // ── Pass 1: count valid points, detect RGB, compute bounds ──────────────
  let count = 0;
  let hasRGB = false;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  forEachLine(text, (line) => {
    const nums = parseLine(line);
    if (!nums) return;
    count++;
    const x = nums[0], y = nums[1], z = nums[2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    if (!hasRGB && nums.length >= 6) hasRGB = true;
  });

  if (count === 0) {
    throw new Error('No valid point data found in file');
  }

  // ── Allocate output arrays ───────────────────────────────────────────────
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rangeZ = maxZ - minZ || 1;

  // ── Pass 2: fill arrays ──────────────────────────────────────────────────
  let idx = 0;
  forEachLine(text, (line) => {
    const nums = parseLine(line);
    if (!nums) return;

    const x = nums[0], y = nums[1], z = nums[2];
    positions[idx * 3]     = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    if (hasRGB && nums.length >= 6) {
      const maxVal = nums[3] > 1 || nums[4] > 1 || nums[5] > 1 ? 255 : 1;
      colors[idx * 3]     = nums[3] / maxVal;
      colors[idx * 3 + 1] = nums[4] / maxVal;
      colors[idx * 3 + 2] = nums[5] / maxVal;
    } else {
      const t = (z - minZ) / rangeZ;
      const [r, g, b] = heightToColor(t);
      colors[idx * 3]     = r;
      colors[idx * 3 + 1] = g;
      colors[idx * 3 + 2] = b;
    }

    idx++;
    if (idx >= count) return;
  });

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
 * Async streaming parser using FileReader + chunked processing.
 * Reads the File in 64 MB chunks, never holds the full text in memory at once.
 * Reports progress via onProgress(0..1).
 */
export async function parsePointCloudAsync(
  file: File,
  onProgress?: (progress: number, stage: string) => void
): Promise<PointCloud> {
  const CHUNK = 64 * 1024 * 1024; // 64 MB per chunk
  const fileSize = file.size;

  // ── Pass 1: count + bounds ───────────────────────────────────────────────
  let count = 0;
  let hasRGB = false;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let remainder = '';

  const readChunk = (start: number, end: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const blob = file.slice(start, end);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

  for (let offset = 0; offset < fileSize; offset += CHUNK) {
    const chunkText = await readChunk(offset, Math.min(offset + CHUNK, fileSize));
    const combined = remainder + chunkText;

    // Split on newlines, keep last partial line as remainder
    const lastNL = combined.lastIndexOf('\n');
    const toProcess = lastNL >= 0 ? combined.slice(0, lastNL) : combined;
    remainder = lastNL >= 0 ? combined.slice(lastNL + 1) : '';

    forEachLine(toProcess, (line) => {
      const nums = parseLine(line);
      if (!nums) return;
      count++;
      const x = nums[0], y = nums[1], z = nums[2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      if (!hasRGB && nums.length >= 6) hasRGB = true;
    });

    onProgress?.(0.45 * (offset + CHUNK) / fileSize, '扫描中...');
    // Yield to event loop every chunk to keep UI responsive
    await new Promise(r => setTimeout(r, 0));
  }

  // Process any remaining text
  if (remainder.trim()) {
    const nums = parseLine(remainder);
    if (nums) {
      count++;
      const x = nums[0], y = nums[1], z = nums[2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      if (!hasRGB && nums.length >= 6) hasRGB = true;
    }
  }

  if (count === 0) throw new Error('No valid point data found in file');

  onProgress?.(0.5, '分配内存...');
  await new Promise(r => setTimeout(r, 0));

  // ── Allocate ─────────────────────────────────────────────────────────────
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rangeZ = maxZ - minZ || 1;

  // ── Pass 2: fill arrays ──────────────────────────────────────────────────
  let idx = 0;
  remainder = '';

  for (let offset = 0; offset < fileSize; offset += CHUNK) {
    const chunkText = await readChunk(offset, Math.min(offset + CHUNK, fileSize));
    const combined = remainder + chunkText;

    const lastNL = combined.lastIndexOf('\n');
    const toProcess = lastNL >= 0 ? combined.slice(0, lastNL) : combined;
    remainder = lastNL >= 0 ? combined.slice(lastNL + 1) : '';

    forEachLine(toProcess, (line) => {
      const nums = parseLine(line);
      if (!nums || idx >= count) return;

      positions[idx * 3]     = nums[0];
      positions[idx * 3 + 1] = nums[1];
      positions[idx * 3 + 2] = nums[2];

      if (hasRGB && nums.length >= 6) {
        const maxVal = nums[3] > 1 || nums[4] > 1 || nums[5] > 1 ? 255 : 1;
        colors[idx * 3]     = nums[3] / maxVal;
        colors[idx * 3 + 1] = nums[4] / maxVal;
        colors[idx * 3 + 2] = nums[5] / maxVal;
      } else {
        const t = (nums[2] - minZ) / rangeZ;
        const [r, g, b] = heightToColor(t);
        colors[idx * 3]     = r;
        colors[idx * 3 + 1] = g;
        colors[idx * 3 + 2] = b;
      }
      idx++;
    });

    onProgress?.(0.5 + 0.48 * (offset + CHUNK) / fileSize, '解析中...');
    await new Promise(r => setTimeout(r, 0));
  }

  // Remaining line
  if (remainder.trim() && idx < count) {
    const nums = parseLine(remainder);
    if (nums) {
      positions[idx * 3]     = nums[0];
      positions[idx * 3 + 1] = nums[1];
      positions[idx * 3 + 2] = nums[2];
      if (hasRGB && nums.length >= 6) {
        const maxVal = nums[3] > 1 || nums[4] > 1 || nums[5] > 1 ? 255 : 1;
        colors[idx * 3]     = nums[3] / maxVal;
        colors[idx * 3 + 1] = nums[4] / maxVal;
        colors[idx * 3 + 2] = nums[5] / maxVal;
      } else {
        const t = (nums[2] - minZ) / rangeZ;
        const [r, g, b] = heightToColor(t);
        colors[idx * 3]     = r;
        colors[idx * 3 + 1] = g;
        colors[idx * 3 + 2] = b;
      }
    }
  }

  onProgress?.(1, '完成');

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
 */
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
  const step = (maxVal - minVal) / n;

  const buckets: number[][] = Array.from({ length: n }, () => []);

  for (let i = 0; i < cloud.count; i++) {
    const val = cloud.points[i * 3 + axisIdx];
    let bucket = Math.floor((val - minVal) / step);
    if (bucket >= n) bucket = n - 1;
    if (bucket < 0) bucket = 0;
    buckets[bucket].push(i);
  }

  return buckets.map((indices, sliceIndex) => {
    const cnt = indices.length;
    const pts = new Float32Array(cnt * 3);
    const cols = new Float32Array(cnt * 3);

    let lMinX = Infinity, lMinY = Infinity, lMinZ = Infinity;
    let lMaxX = -Infinity, lMaxY = -Infinity, lMaxZ = -Infinity;

    for (let j = 0; j < cnt; j++) {
      const s = indices[j];
      const x = cloud.points[s * 3], y = cloud.points[s * 3 + 1], z = cloud.points[s * 3 + 2];
      pts[j * 3] = x; pts[j * 3 + 1] = y; pts[j * 3 + 2] = z;
      cols[j * 3] = cloud.colors[s * 3];
      cols[j * 3 + 1] = cloud.colors[s * 3 + 1];
      cols[j * 3 + 2] = cloud.colors[s * 3 + 2];
      if (x < lMinX) lMinX = x; if (x > lMaxX) lMaxX = x;
      if (y < lMinY) lMinY = y; if (y > lMaxY) lMaxY = y;
      if (z < lMinZ) lMinZ = z; if (z > lMaxZ) lMaxZ = z;
    }

    if (cnt === 0) { lMinX = lMinY = lMinZ = 0; lMaxX = lMaxY = lMaxZ = 0; }

    return {
      points: pts, colors: cols, count: cnt, sliceIndex,
      bounds: {
        min: { x: lMinX, y: lMinY, z: lMinZ },
        max: { x: lMaxX, y: lMaxY, z: lMaxZ },
        center: { x: (lMinX + lMaxX) / 2, y: (lMinY + lMaxY) / 2, z: (lMinZ + lMaxZ) / 2 },
        size: { x: lMaxX - lMinX, y: lMaxY - lMinY, z: lMaxZ - lMinZ },
      },
    };
  });
}

/**
 * Project point cloud onto a plane
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
      projected[i * 3] = x; projected[i * 3 + 1] = y; projected[i * 3 + 2] = 0;
    } else if (plane === 'xz') {
      projected[i * 3] = x; projected[i * 3 + 1] = 0; projected[i * 3 + 2] = z;
    } else {
      projected[i * 3] = 0; projected[i * 3 + 1] = y; projected[i * 3 + 2] = z;
    }
  }

  return { points: projected, colors, count, bounds: cloud.bounds };
}
