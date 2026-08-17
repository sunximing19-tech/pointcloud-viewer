# SpatialLM 接入待办

- [x] 将 SpatialLM 推理结果接入点云项目状态
- [x] 在控制面板增加 AI 语义分析入口和推理服务地址配置
- [x] 在 Three.js 视图叠加 Z-up 语义边界框与标签
- [x] 修正并完善本地 SpatialLM FastAPI 适配服务
- [x] 补充 README 的模型部署与接口说明
- [x] 运行 TypeScript 检查和生产构建
- [ ] 保存最终检查点

## 已确认的官方事实

- SpatialLM 输入点云要求轴对齐，Z 轴为向上方向。
- 官方推理脚本通过 `inference.py` 读取 `.ply`，使用 `SpatialLM1.1-Qwen-0.5B` 或 `SpatialLM1.1-Llama-1B`。
- 输出经 `Layout.to_language_string()` 写入文本，包含墙、门、窗和 Bbox 结构。
- 官方环境：Python 3.11、PyTorch 2.4.1、CUDA 12.4；推理需要 GPU。
- 对前端暂时提供可配置的 HTTP 推理服务接口，浏览器本身不直接加载 Python/CUDA 模型。
- 暂不把本地模拟结果标记为真实 SpatialLM 结果；模拟模式必须有明确提示。

参考来源：
- https://github.com/manycore-research/SpatialLM
- https://raw.githubusercontent.com/manycore-research/SpatialLM/main/inference.py
- https://raw.githubusercontent.com/manycore-research/SpatialLM/main/code_template.txt
- https://raw.githubusercontent.com/manycore-research/SpatialLM/main/visualize.py
- https://huggingface.co/manycore-research/SpatialLM1.1-Qwen-0.5B

## Style reminder

- 暗夜宇宙视觉风格；Space Grotesk + Space Mono。
- Z-up 坐标系；语义框使用高对比描边、半透明面和标签。
- 不重复引用已经确认的参考页面。
