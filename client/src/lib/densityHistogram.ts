/**
 * densityHistogram.ts
 * Computes a 2D point density histogram by projecting a point cloud
 * onto a chosen plane and counting points per grid cell.
 *
 * Grid cell size = multiplier * medianNearestNeighborDistance
 *
 * Nearest-neighbor estimation:
 *   For large clouds we subsample to keep it fast.
 *   We use a simple grid-based approximate 1-NN in 3D.
 */

import type { PointCloud, PointCloudSlice } from './pointCloudParser';

export type HistogramAxis = 'x' | 'y' | 'z';

export interface DensityCell {
  u: number;   // grid col index
  v: number;   // grid row index
  count: number;
  uCenter: number; // world coord center of cell (horizontal axis)
  vCenter: number; // world coord center of cell (vertical axis)
}

export interface DensityHistogram {
  cells: DensityCell[];
  maxCount: number;
  totalCount: number;
  cellSize: number;         // actual cell size used
  medianNN: number;         // computed median nearest-neighbor distance
  uAxis: HistogramAxis;     // horizontal axis of the 2D projection
  vAxis: HistogramAxis;     // vertical axis of the 2D projection
  projAxis: HistogramAxis;  // axis projected away (collapsed)
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  uBins: number;
  vBins: number;
}

/**
 * Estimate median 1-NN distance using a subsampled grid approach.
 * We subsample at most `maxSamples` points for speed.
 */
export function estimateMedianNN(
  points: Float32Array,
  count: number,
  maxSamples = 2000
): number {
  if (count < 2) return 1;

  // Subsample
  const step = Math.max(1, Math.floor(count / maxSamples));
  const sampleIndices: number[] = [];
  for (let i = 0; i < count; i += step) sampleIndices.push(i);

  const distances: number[] = [];

  // For each sample, find approximate nearest neighbor among ALL points
  // using a simple O(n_samples * n_all / gridFactor) approach with spatial grid
  // Build a flat grid for fast lookup
  const n = count;
  const px = (i: number) => points[i * 3];
  const py = (i: number) => points[i * 3 + 1];
  const pz = (i: number) => points[i * 3 + 2];

  // Compute bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = px(i), y = py(i), z = pz(i);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;

  // Use a coarse grid (30^3 max) for bucketing
  const G = Math.min(30, Math.ceil(Math.cbrt(n / 4)));
  const grid = new Map<number, number[]>();

  const cellKey = (ci: number, cj: number, ck: number) =>
    ci * G * G + cj * G + ck;

  const toCell = (x: number, y: number, z: number): [number, number, number] => [
    Math.min(G - 1, Math.floor(((x - minX) / rangeX) * G)),
    Math.min(G - 1, Math.floor(((y - minY) / rangeY) * G)),
    Math.min(G - 1, Math.floor(((z - minZ) / rangeZ) * G)),
  ];

  for (let i = 0; i < n; i++) {
    const [ci, cj, ck] = toCell(px(i), py(i), pz(i));
    const key = cellKey(ci, cj, ck);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(i);
  }

  for (const si of sampleIndices) {
    const sx = px(si), sy = py(si), sz = pz(si);
    const [ci, cj, ck] = toCell(sx, sy, sz);

    let minDist2 = Infinity;

    // Search 3x3x3 neighborhood of cells
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        for (let dk = -1; dk <= 1; dk++) {
          const ni = ci + di, nj = cj + dj, nk = ck + dk;
          if (ni < 0 || ni >= G || nj < 0 || nj >= G || nk < 0 || nk >= G) continue;
          const bucket = grid.get(cellKey(ni, nj, nk));
          if (!bucket) continue;
          for (const idx of bucket) {
            if (idx === si) continue;
            const dx = px(idx) - sx;
            const dy = py(idx) - sy;
            const dz = pz(idx) - sz;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < minDist2) minDist2 = d2;
          }
        }
      }
    }

    if (minDist2 < Infinity) distances.push(Math.sqrt(minDist2));
  }

  if (distances.length === 0) return 1;
  distances.sort((a, b) => a - b);
  return distances[Math.floor(distances.length / 2)];
}

/**
 * Compute 2D density histogram.
 * projAxis: the axis to collapse (project away)
 * multiplier: cell size = multiplier * medianNN
 */
export function computeDensityHistogram(
  cloud: PointCloud | PointCloudSlice,
  projAxis: HistogramAxis,
  multiplier: number,
  precomputedMedianNN?: number
): DensityHistogram {
  const { points, count, bounds } = cloud;

  // Determine 2D axes
  const allAxes: HistogramAxis[] = ['x', 'y', 'z'];
  const [uAxis, vAxis] = allAxes.filter(a => a !== projAxis) as [HistogramAxis, HistogramAxis];

  const uIdx = uAxis === 'x' ? 0 : uAxis === 'y' ? 1 : 2;
  const vIdx = vAxis === 'x' ? 0 : vAxis === 'y' ? 1 : 2;

  const uMin = bounds.min[uAxis];
  const uMax = bounds.max[uAxis];
  const vMin = bounds.min[vAxis];
  const vMax = bounds.max[vAxis];

  // Compute median NN
  const medianNN = precomputedMedianNN ?? estimateMedianNN(points, count);
  const cellSize = Math.max(multiplier * medianNN, 1e-9);

  const uBins = Math.max(1, Math.ceil((uMax - uMin) / cellSize));
  const vBins = Math.max(1, Math.ceil((vMax - vMin) / cellSize));

  // Cap bins to avoid memory explosion
  const maxBins = 500;
  const actualUBins = Math.min(uBins, maxBins);
  const actualVBins = Math.min(vBins, maxBins);
  const actualCellSizeU = (uMax - uMin) / actualUBins;
  const actualCellSizeV = (vMax - vMin) / actualVBins;
  const effectiveCellSize = Math.max(actualCellSizeU, actualCellSizeV);

  // Count points per cell
  const grid = new Int32Array(actualUBins * actualVBins);

  for (let i = 0; i < count; i++) {
    const u = points[i * 3 + uIdx];
    const v = points[i * 3 + vIdx];
    let cu = Math.floor((u - uMin) / actualCellSizeU);
    let cv = Math.floor((v - vMin) / actualCellSizeV);
    cu = Math.max(0, Math.min(actualUBins - 1, cu));
    cv = Math.max(0, Math.min(actualVBins - 1, cv));
    grid[cv * actualUBins + cu]++;
  }

  // Build cell list (only non-empty)
  const cells: DensityCell[] = [];
  let maxCount = 0;

  for (let cv = 0; cv < actualVBins; cv++) {
    for (let cu = 0; cu < actualUBins; cu++) {
      const c = grid[cv * actualUBins + cu];
      if (c === 0) continue;
      if (c > maxCount) maxCount = c;
      cells.push({
        u: cu,
        v: cv,
        count: c,
        uCenter: uMin + (cu + 0.5) * actualCellSizeU,
        vCenter: vMin + (cv + 0.5) * actualCellSizeV,
      });
    }
  }

  return {
    cells,
    maxCount,
    totalCount: count,
    cellSize: effectiveCellSize,
    medianNN,
    uAxis,
    vAxis,
    projAxis,
    uMin,
    uMax,
    vMin,
    vMax,
    uBins: actualUBins,
    vBins: actualVBins,
  };
}
