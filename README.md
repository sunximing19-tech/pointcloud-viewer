# Point Cloud Viewer（点云展示与分析平台）

**当前软件版本：`v1.0.0`**

Point Cloud Viewer 是一个面向三维视觉研究、测绘工程和点云数据分析的点云展示工具。它支持 TXT/XYZ/PTS/CSV 点云导入、Z-up 坐标系下的彩色 3D 渲染、视角控制、均匀切分、平面投影、点密度直方图和多项目管理。

从 `v1.0.0` 开始，项目同时提供浏览器版源码和 Windows/macOS 桌面版封装。桌面版将前端资源内嵌到原生应用中，用户运行时不需要安装 Node.js，也不需要保持网络连接。

---

## 软件版本

| 项目 | 信息 |
| :--- | :--- |
| 当前版本 | `v1.0.0` |
| 发布渠道 | [GitHub Releases](https://github.com/sunximing19-tech/pointcloud-viewer/releases) |
| Windows 安装包 | `.msi` / `.exe`（由 Windows 构建环境生成） |
| macOS 安装包 | `.dmg` / `.app`（由 macOS 构建环境生成） |
| 运行时依赖 | 桌面版无需 Node.js；点云导入与分析功能无需网络 |
| 模型服务 | 当前版本不包含 SpatialLM 功能；如后续启用模型服务，需要另行配置真实推理环境 |

---

## 平台用途与核心功能

本平台为三维点云数据提供可视化和交互式分析能力。所有点云文件都在本地浏览器或桌面应用中处理，不会自动上传。

| 核心模块 | 功能说明 |
| :--- | :--- |
| **大型点云导入** | 支持 `.txt`、`.xyz`、`.pts`、`.csv` 格式，采用异步流式分块解析并显示导入进度。 |
| **彩色渲染系统** | 支持 XYZ 与 XYZRGB 数据；无 RGB 时根据 Z 轴高度映射彩虹色谱。 |
| **3D 交互控制** | 左键旋转、右键平移、滚轮缩放，支持视角锁定和 ISO/正视/俯视/侧视预设。 |
| **项目管理系统** | 支持创建、切换、重命名和删除多个项目。 |
| **点云均匀切分** | 支持沿 X、Y、Z 轴切分为 2–50 份，支持整体查看和单片查看。 |
| **平面投影** | 支持将整体点云或切片投影到 XY、XZ、YZ 平面。 |
| **点密度直方图** | 支持选择投影方向，网格大小默认基于 3D 点云第一最近邻距离的中位数，并允许调整倍率。 |

<img width="949" height="461" alt="image" src="https://github.com/user-attachments/assets/e0b06a1c-31ff-4766-a642-20a67c385a68" />
---

## 桌面版：Windows 与 macOS

### 下载发布版本

打开 [GitHub Releases](https://github.com/sunximing19-tech/pointcloud-viewer/releases)，选择对应系统的 `v1.0.0` 发布版本：

- Windows 用户下载 `.msi` 或 `.exe` 安装包。
- macOS 用户下载 `.dmg` 文件，将应用拖入 `Applications` 文件夹后启动。

桌面版启动后即可离线导入和分析点云。首次启动不需要下载 Node.js、pnpm 或其他 JavaScript 运行时。软件不会因为离线而失去点云展示、切分、投影和直方图功能。

> ### 💡 macOS 提示“已损坏、无法打开”的解决方法
> 
> 由于当前 Release 采用未签名构建，macOS Gatekeeper 安全机制可能会拦截应用并弹出 **“已损坏，打不开。您应该将它移到废纸篓”** 的提示。这并不是文件真正损坏，只需在终端中执行以下命令解除系统的隔离属性即可正常打开：
> 
> ```bash
> sudo xattr -cr /Applications/PointCloud\ Viewer.app
> ```
> *(或者直接将应用拖入 `Applications` 后运行上述命令)*

### 从源码构建桌面版

源码开发和构建阶段需要 Node.js、pnpm、Rust 以及对应平台的原生构建工具；这些依赖只用于构建，不会成为最终用户的运行时要求。

```bash
git clone https://github.com/sunximing19-tech/pointcloud-viewer.git
cd pointcloud-viewer
pnpm install
pnpm desktop:build
```

构建产物通常位于 `src-tauri/target/release/bundle/`。Windows 与 macOS 安装包应在对应平台的构建机上生成；项目已配置 GitHub Actions，可在推送版本标签后自动构建不同平台产物。

---

## 浏览器版开发方式

如果希望以浏览器方式运行或修改源码，可以执行：

```bash
pnpm install
pnpm dev
```

启动后打开终端输出的地址，通常为 `http://localhost:3000`。浏览器版同样支持离线点云处理，但浏览器本身仍需要由本机的浏览器程序运行。

---

## 点云案例展示

平台提供“加载示例数据”入口，可在没有准备点云文件的情况下体验功能。示例场景包含球体、地面、垂直圆柱和斜坡等综合几何结构。

使用时，点击左侧的 **加载示例数据**，随后可以在右侧 3D 视图中旋转、缩放和切换预设视角；接着可沿 Z 轴切分为多个片段，单独查看某个切片，并在底部分析区域添加平面投影或点密度直方图。

![点云展示平台界面](https://github.com/user-attachments/assets/e0b06a1c-31ff-4766-a642-20a67c385a68)

---

## 技术栈

- **前端**：React 19、TypeScript、Vite
- **样式**：Tailwind CSS 4、Lucide Icons
- **3D 渲染**：Three.js
- **桌面封装**：Tauri 2
- **桌面构建**：Rust、GitHub Actions

## 目录说明

```text
client/                 React 前端源码
src-tauri/              Tauri 原生桌面壳与打包配置
.github/workflows/      Windows/macOS 自动构建与发布工作流
spatiallm_service.py    可选的外部模型适配脚本，不属于离线桌面版运行依赖
README.md               项目用途、版本与使用说明
```

## 许可证

本项目沿用仓库当前的 MIT 许可证。第三方依赖和平台运行时分别遵循其各自许可证。
