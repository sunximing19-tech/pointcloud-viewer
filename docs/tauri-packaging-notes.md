# Tauri 离线桌面封装调研

## 结论

Tauri 2 可以将 Vite/React 前端打包为 Windows Installer 与 macOS DMG/App Bundle。官方文档说明：打包后的应用不要求用户安装 Node.js，Node.js 只在开发和构建阶段使用；应用运行时使用原生壳与平台 WebView。

Tauri 构建阶段需要 Rust；使用 JavaScript 前端时，构建阶段也需要 Node.js/pnpm。Windows 构建需要 Microsoft C++ Build Tools 与 WebView2；macOS 构建需要在 macOS 机器上完成并满足 Apple 平台构建/签名条件。当前 Ubuntu 沙箱不能诚实地产出 macOS DMG 或签名 Windows 安装包，因此应配置 GitHub Actions，在 `windows-latest` 和 `macos-latest` runner 上分别构建，再将真实产物上传到 GitHub Release。

## 用户需求的匹配

| 需求 | Tauri 方案 |
|---|---|
| 用户无需安装 Node.js | 满足。Node.js 仅在构建阶段存在于 CI。 |
| 运行时不联网 | 满足。当前点云导入、渲染、切分、投影和直方图均可本地运行；不加入任何联网依赖。 |
| Windows 软件 | 通过 Windows CI 生成 `.msi` 或 `.exe` 安装包。 |
| macOS 软件 | 通过 macOS CI 生成 `.dmg` / `.app`；签名与公证可后续配置。 |
| GitHub Release | 使用 `gh release create` 或 GitHub Actions release job 上传真实构建产物。 |

## 官方参考

- https://v2.tauri.app/distribute/
- https://v2.tauri.app/start/prerequisites/
- https://v2.tauri.app/distribute/macos-application-bundle/
- https://v2.tauri.app/distribute/windows-installer/
