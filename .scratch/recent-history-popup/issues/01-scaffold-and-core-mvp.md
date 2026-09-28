# 01 — Scaffold MV3 扩展并打通核心闭环（从零到可用 MVP）

**What to build:** 从零搭建 MV3 扩展并打通核心闭环——点击工具栏图标，弹窗展示浏览器最近 30 个不重复**浏览记录（最近30条）**（来自原生 **历史来源** `chrome.history`，依 ADR-0001），每条含本地**首字母头像（Favicon）**、页面标题与**相对时间（Relative Time）**；点击某条在其**前台激活新标签（Foreground New Tab）**打开。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 扩展可按 MV3 加载于 Chrome 152：`manifest_version: 3`，`permissions: ["history"]`，`minimum_chrome_version: "128"`，`action.default_popup` 指向弹窗 HTML
- [x] 点击工具栏图标弹出已排版的弹窗（含占位图标与基础样式）
- [x] 弹窗调用 `chrome.history.search({ text: "", startTime: 0, maxResults: 30 })` 取得最近 30 个不重复网址（已按 `lastVisitTime` 倒序，无需额外去重）
- [x] 每条记录显示本地首字母头像：取主机名首字母、按域名哈希得稳定颜色，纯本地、无任何网络请求（不连 Google）
- [x] 每条记录显示页面标题与相对时间（如 "5分钟前"）
- [x] 点击某条记录以 `chrome.tabs.create({ url, active: true })` 在前台新标签打开
- [x] 全程无任何第三方请求（含 favicon），满足隐私预期

## Comments

- 已在根提交 `509b07c` 实现并提交。视图模型接缝的单元测试 6/6 通过。经双轴代码评审，修正了「按网址去重」与「取主机名首字母（不去 www.）」两处以符合 CONTEXT.md。此工单关闭。
- 验证加载方式：Chrome 打开 `chrome://extensions` → 开启开发者模式 → 「加载已解压的扩展程序」→ 选择本仓库目录。点击工具栏图标即可见效果。
