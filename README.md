# Point Cloud Viewer（点云展示与分析平台）

基于 React 19、TypeScript、Vite 与 Three.js 构建的 3D 点云可视化和分析平台。网站支持 TXT/XYZ/PTS/CSV 点云导入、Z-up 坐标系渲染、多项目管理、点云切分、平面投影、点密度直方图，以及可选的 SpatialLM AI 语义分析服务。

> **重要说明：** SpatialLM 是需要 Python、PyTorch、CUDA 和 GPU 的独立推理模型。浏览器端只负责上传当前项目的原始点云文件、调用 HTTP 推理服务并显示返回的语义边界框；浏览器不会直接加载 SpatialLM 权重。

## 平台用途

本平台面向三维视觉研究、测绘与室内空间分析场景，用于快速检查点云几何结构、观察不同方向的切分结果、分析投影密度，并在接入本地 SpatialLM 服务后，将模型识别出的墙体、门窗和物体语义框叠加到同一 Z-up 三维视图中。

| 模块 | 功能 |
| :--- | :--- |
| **点云导入** | 支持 `.txt`、`.xyz`、`.pts`、`.csv` 等文本点云格式，支持 `x y z` 和 `x y z r g b` 行格式，并提供大文件分块解析进度。 |
| **3D 查看** | 左键旋转、右键平移、滚轮缩放；支持 ISO、正视、俯视、侧视和视角锁定。 |
| **Z-up 坐标系** | X/Y 位于水平面，Z 轴朝上，与 SpatialLM 官方输入约定保持一致。[1] |
| **项目管理** | 支持新建、切换、重命名和删除项目；每个项目独立保存点云、原始文件引用和 SpatialLM 分析结果。 |
| **切分与投影** | 支持沿 X/Y/Z 轴均匀切分 2~50 份，并将整体或单个切片投影到 XY、XZ、YZ 平面。 |
| **密度直方图** | 投影方向可选，网格大小默认为“最近邻距离中位数 × 1”，倍率可以调节。 |
| **AI 语义分析** | 通过 SpatialLM HTTP 服务检测建筑元素或指定家具类别，并在 3D 视图中显示彩色半透明语义边界框和标签。 |

## 下载与打开

### 直接打开在线版本

如果项目已部署，可直接打开项目的在线地址：

<https://pointcloud-b8ykuahh.manus.space>

在线页面适合查看界面和导入小型点云。若需要运行 SpatialLM，推荐在本地或带 GPU 的机器上启动推理服务，再将左侧“AI 语义分析”面板中的服务地址改为该服务可访问的地址。

### 本地运行网站

```bash
git clone https://github.com/sunximing19-tech/pointcloud-viewer.git
cd pointcloud-viewer
pnpm install
pnpm dev
```

然后在浏览器打开终端显示的地址，通常是 `http://localhost:3000`。生产构建命令如下：

```bash
pnpm check
pnpm build
```

## 点云案例展示

网站内置“加载示例数据”按钮，会生成一个包含球体、地面、圆柱和斜坡的 Z-up 综合几何场景。加载后可以旋转和缩放点云，选择 Z 轴切分，创建投影视图或密度直方图，也可以将示例文件直接提交给 SpatialLM 服务进行测试。

对于真实数据，点击“导入点云 (.txt)”并选择本地文本文件。推荐每行使用以下格式之一：

```text
x y z
x y z r g b
```

导入后，点云会使用带 RGB 的原始颜色；没有 RGB 时会按照 Z 轴高度自动着色。若点云坐标原本不是 Z-up，需要在导入前完成坐标轴转换，否则 SpatialLM 的空间理解和边界框方向可能不正确。[1]

## SpatialLM 接入

### 官方模型与输入输出约定

本项目适配 SpatialLM 1.1 的推理流程。官方推理脚本使用 `.ply` 点云作为输入，调用 `SpatialLM1.1-Qwen-0.5B` 或 `SpatialLM1.1-Llama-1B`，并要求输入点云轴对齐、Z 轴向上。[1] 官方代码模板包括 `Wall`、`Door`、`Window` 与 `Bbox` 结构；推理结果经 `Layout.to_language_string()` 写入结构化文本，再由 `Layout.to_boxes()` 转换为可视化框。[2] [3]

当前仓库中的 `spatiallm_service.py` 是一个 HTTP 适配层。它接收网站上传的 TXT/XYZ 点云，转换为临时 PLY，执行官方 SpatialLM 推理流程，然后返回以下 JSON 结构：

```json
{
  "success": true,
  "filename": "scene.txt",
  "point_count": 120000,
  "detect_type": "object",
  "model": "manycore-research/SpatialLM1.1-Qwen-0.5B",
  "boxes": [
    {
      "id": "0",
      "label": "sofa",
      "class": "object",
      "center": [1.2, 0.4, 0.5],
      "size": [1.8, 0.8, 0.9],
      "rotation": [0.0, 0.0, 0.15]
    }
  ],
  "raw_layout": "..."
}
```

### GPU 服务环境

官方仓库给出的测试环境包括 Python 3.11、PyTorch 2.4.1 和 CUDA 12.4；SpatialLM 1.1 还需要 Sonata、FlashAttention 等依赖。[1] 这些依赖不适合直接安装到纯前端网页中，因此需要在具备 NVIDIA GPU 的本地机器或独立 GPU 服务器运行。

```bash
git clone https://github.com/manycore-research/SpatialLM.git
cd SpatialLM

conda create -n spatiallm python=3.11
conda activate spatiallm
conda install -y -c nvidia/label/cuda-12.4.0 cuda-toolkit conda-forge::sparsehash

pip install poetry
poetry config virtualenvs.create false --local
poetry install
poe install-sonata
pip install fastapi uvicorn python-multipart
```

在本项目目录启动适配服务：

```bash
cd /path/to/pointcloud-viewer
SPATIALLM_REPO=/path/to/SpatialLM \
MODEL_PATH=manycore-research/SpatialLM1.1-Qwen-0.5B \
python spatiallm_service.py
```

可先检查服务：

```bash
curl http://localhost:8000/health
```

成功启动后，在网站左侧“AI 语义分析”区域填写：

| 设置项 | 说明 |
| :--- | :--- |
| **物体** | 使用 SpatialLM 的 `detect_type=object`，可在类别输入框填写 `bed, sofa, chair` 等类别。 |
| **建筑** | 使用 `detect_type=arch`，主要检测墙、门和窗。 |
| **全部** | 使用 `detect_type=all`，同时请求建筑元素和物体框。 |
| **服务地址** | 默认是 `http://localhost:8000/api/predict-spatiallm`；若网页和推理服务不在同一台机器，需要填写可访问的完整地址并配置 CORS。 |

点击“运行 AI 语义分析”后，结果会保存在当前项目中。返回的每个框会以不同颜色显示，包含半透明体、边缘描边、语义标签和可用时的置信度；切换到其他项目后，当前项目的点云和语义框不会混在一起。

### 推理服务与部署边界

SpatialLM 官方仓库提供的是 Python 推理脚本和模型权重，并没有针对本点云网站的现成 HTTP API。[1] 本项目的适配服务将官方脚本包装为网页可调用的上传接口。因此，在线网页本身可以正常展示界面，但只有在用户同时运行兼容的 GPU 推理服务时，AI 语义分析按钮才能返回真实 SpatialLM 结果。服务不可用时，页面会显示明确错误，不会用模拟结果冒充模型输出。

## 技术栈

| 类别 | 技术 |
| :--- | :--- |
| 前端 | React 19、TypeScript、Vite |
| 3D | Three.js、Z-up 相机和场景辅助线 |
| 样式 | Tailwind CSS 4、Lucide Icons、暗夜宇宙视觉主题 |
| 模型适配 | FastAPI、Uvicorn、SpatialLM 官方 Python 推理流程 |
| 模型环境 | Python 3.11、PyTorch 2.4.1、CUDA 12.4、NVIDIA GPU |

## 参考资料

[1]: https://github.com/manycore-research/SpatialLM "SpatialLM 官方 GitHub 仓库与 README"
[2]: https://raw.githubusercontent.com/manycore-research/SpatialLM/main/code_template.txt "SpatialLM 官方结构化输出模板"
[3]: https://raw.githubusercontent.com/manycore-research/SpatialLM/main/visualize.py "SpatialLM 官方 Layout 可视化代码"
[4]: https://huggingface.co/manycore-research/SpatialLM1.1-Qwen-0.5B "SpatialLM1.1-Qwen-0.5B 模型页面"
