# macOS DMG 损坏提示排查待办

- [x] 分析 macOS 报错“已损坏、无法打开”的根源（Gatekeeper 安全隔离与未签名应用策略）
- [ ] 在 README 中补充一键解除 macOS 隔离属性的终端命令（`xattr -cr`）
- [ ] 检查 Tauri 配置的 macOS 目标架构（支持 universal 或通用包，避免 Apple Silicon / Intel 架构不匹配）
- [ ] 更新 Release 说明与文档，重新构建发布
