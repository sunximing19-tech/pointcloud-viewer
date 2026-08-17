/**
 * SpatialLM Client
 *
 * The browser never loads Python/CUDA weights. It uploads the project source file
 * to a separately running SpatialLM HTTP service and receives structured boxes.
 */

export interface Bbox3D {
  label: string;
  center: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
  confidence?: number;
}

export interface SpatialLMResult {
  success: boolean;
  filename: string;
  point_count: number;
  detect_type: string;
  boxes: Bbox3D[];
  raw_layout?: string;
  model?: string;
  simulated?: boolean;
}

export async function runSpatialLMInference(
  file: File | Blob,
  fileName: string,
  detectType: 'all' | 'arch' | 'object' = 'object',
  categories: string[] = [],
  endpoint = 'http://localhost:8000/api/predict-spatiallm',
): Promise<SpatialLMResult> {
  const formData = new FormData();
  formData.append('file', file, fileName);
  formData.append('detect_type', detectType);
  formData.append('categories', categories.join(' '));

  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', body: formData });
  } catch {
    throw new Error(`无法连接 SpatialLM 服务：${endpoint}。请先启动本地 GPU 推理服务。`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`SpatialLM 服务返回 HTTP ${response.status}${detail ? `：${detail.slice(0, 240)}` : ''}`);
  }

  const data = (await response.json()) as SpatialLMResult;
  if (!data || data.success === false || !Array.isArray(data.boxes)) {
    throw new Error('SpatialLM 服务返回的数据格式无效，缺少 boxes 数组。');
  }
  return data;
}
