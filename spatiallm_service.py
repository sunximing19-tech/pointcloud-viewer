"""
SpatialLM HTTP adapter for Point Cloud Viewer.

This adapter follows the official SpatialLM inference flow:
1. Upload text XYZ[RGB] data from the browser.
2. Convert it to a temporary axis-aligned Z-up PLY file.
3. Run the official SpatialLM 1.1 `preprocess_point_cloud` and `generate_layout` flow.
4. Convert `Layout.to_boxes()` into a JSON response consumed by the Three.js viewer.

Run this file inside the official SpatialLM Python environment, from the cloned
SpatialLM repository (or set SPATIALLM_REPO to that repository path).

Expected environment:
  Python 3.11, PyTorch 2.4.1, CUDA 12.4, SpatialLM 1.1 dependencies.

Example:
  SPATIALLM_REPO=/opt/SpatialLM \
  MODEL_PATH=manycore-research/SpatialLM1.1-Qwen-0.5B \
  python spatiallm_service.py
"""

from __future__ import annotations

import math
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

SPATIALLM_REPO = Path(os.environ.get("SPATIALLM_REPO", Path(__file__).resolve().parent))
if str(SPATIALLM_REPO) not in sys.path:
    sys.path.insert(0, str(SPATIALLM_REPO))

MODEL_PATH = os.environ.get("MODEL_PATH", "manycore-research/SpatialLM1.1-Qwen-0.5B")
CODE_TEMPLATE = Path(os.environ.get("CODE_TEMPLATE", str(SPATIALLM_REPO / "code_template.txt")))
INFERENCE_DTYPE = os.environ.get("INFERENCE_DTYPE", "bfloat16")

app = FastAPI(title="SpatialLM Inference Adapter", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("VIEWER_ORIGIN", "*")],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
)

_model = None
_tokenizer = None
_torch = None


def _load_model() -> tuple[Any, Any, Any]:
    """Load the official model once per process; weights remain on the GPU."""
    global _model, _tokenizer, _torch
    if _model is not None and _tokenizer is not None and _torch is not None:
        return _model, _tokenizer, _torch

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except Exception as exc:  # pragma: no cover - depends on the user's GPU env
        raise RuntimeError(
            "SpatialLM dependencies are unavailable. Run this adapter in the official "
            "Python 3.11 + CUDA 12.4 environment."
        ) from exc

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is required by the official SpatialLM inference flow.")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_PATH,
        torch_dtype=getattr(torch, INFERENCE_DTYPE),
    )
    model.to("cuda")
    model.set_point_backbone_dtype(torch.float32)
    model.eval()
    _model, _tokenizer, _torch = model, tokenizer, torch
    return model, tokenizer, torch


def _parse_txt(raw: bytes) -> tuple[np.ndarray, np.ndarray]:
    """Parse XYZ or XYZRGB text without using the browser's internal buffers."""
    points: list[list[float]] = []
    colors: list[list[float]] = []
    has_rgb = False

    for line in raw.decode("utf-8", errors="ignore").splitlines():
        fields = line.replace(",", " ").split()
        if len(fields) < 3:
            continue
        try:
            xyz = [float(fields[0]), float(fields[1]), float(fields[2])]
        except ValueError:
            continue
        points.append(xyz)
        if len(fields) >= 6:
            try:
                rgb = [float(fields[3]), float(fields[4]), float(fields[5])]
                colors.append(rgb)
                has_rgb = True
            except ValueError:
                colors.append([1.0, 1.0, 1.0])
        else:
            colors.append([1.0, 1.0, 1.0])

    if not points:
        raise ValueError("No valid XYZ point data found in upload.")

    point_array = np.asarray(points, dtype=np.float32)
    color_array = np.asarray(colors, dtype=np.float32)
    if has_rgb and np.nanmax(color_array) > 1.0:
        color_array = color_array / 255.0
    return point_array, np.clip(color_array, 0.0, 1.0)


def _to_float_list(value: Any, length: int = 3) -> list[float]:
    array = np.asarray(value, dtype=np.float32).reshape(-1)
    result = [float(item) for item in array[:length]]
    return result + [0.0] * max(0, length - len(result))


def _yaw_from_rotation(value: Any) -> float:
    matrix = np.asarray(value, dtype=np.float32)
    if matrix.size >= 4:
        matrix = matrix.reshape(3, 3)
        return float(math.atan2(float(matrix[1, 0]), float(matrix[0, 0])))
    if matrix.size:
        return float(matrix.reshape(-1)[-1])
    return 0.0


def _layout_boxes_to_json(layout: Any) -> list[dict[str, Any]]:
    """Convert official Layout.to_boxes() dictionaries to viewer-friendly boxes."""
    boxes: list[dict[str, Any]] = []
    for index, item in enumerate(layout.to_boxes()):
        center = _to_float_list(item.get("center", [0, 0, 0]))
        scale = _to_float_list(item.get("scale", [0, 0, 0]))
        label = str(item.get("label") or item.get("class") or "unknown")
        boxes.append({
            "id": str(item.get("id", index)),
            "label": label,
            "class": str(item.get("class", label)),
            "center": center,
            "size": scale,
            "rotation": [0.0, 0.0, _yaw_from_rotation(item.get("rotation", 0.0))],
        })
    return boxes


def _write_temp_ply(points: np.ndarray, colors: np.ndarray) -> str:
    import open3d as o3d

    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points.astype(np.float64))
    pcd.colors = o3d.utility.Vector3dVector(colors.astype(np.float64))
    handle = tempfile.NamedTemporaryFile(delete=False, suffix=".ply")
    handle.close()
    if not o3d.io.write_point_cloud(handle.name, pcd, write_ascii=False):
        raise RuntimeError("Failed to write temporary PLY for SpatialLM.")
    return handle.name


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": MODEL_PATH,
        "model_loaded": _model is not None,
        "cuda_required": True,
    }


@app.post("/api/predict-spatiallm")
async def predict_spatiallm(
    file: UploadFile = File(...),
    detect_type: str = Form("object"),
    categories: str = Form(""),
) -> dict[str, Any]:
    if detect_type not in {"all", "arch", "object"}:
        raise HTTPException(status_code=400, detail="detect_type must be all, arch, or object")

    raw = await file.read()
    ply_path: str | None = None
    try:
        points, colors = _parse_txt(raw)
        ply_path = _write_temp_ply(points, colors)

        import torch
        from inference import generate_layout, preprocess_point_cloud
        from spatiallm import Layout
        from spatiallm.pcd import cleanup_pcd, get_points_and_colors, load_o3d_pcd

        model, tokenizer, torch = _load_model()
        point_cloud = load_o3d_pcd(ply_path)
        num_bins = model.config.point_config["num_bins"]
        grid_size = Layout.get_grid_size(num_bins)
        point_cloud = cleanup_pcd(point_cloud, voxel_size=grid_size)
        proc_points, proc_colors = get_points_and_colors(point_cloud)
        min_extent = np.min(proc_points, axis=0)
        input_pcd = preprocess_point_cloud(proc_points, proc_colors, grid_size, num_bins)
        input_pcd = input_pcd.to(model.device)

        requested_categories = [item for item in categories.split() if item]
        layout = generate_layout(
            model,
            input_pcd,
            tokenizer,
            str(CODE_TEMPLATE),
            detect_type=detect_type,
            categories=requested_categories,
        )
        layout.translate(min_extent)

        return {
            "success": True,
            "filename": file.filename or "upload.txt",
            "point_count": int(points.shape[0]),
            "detect_type": detect_type,
            "model": MODEL_PATH,
            "boxes": _layout_boxes_to_json(layout),
            "raw_layout": layout.to_language_string(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if ply_path:
            try:
                Path(ply_path).unlink(missing_ok=True)
            except OSError:
                pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
