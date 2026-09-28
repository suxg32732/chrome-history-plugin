# 数量角标改用 OffscreenCanvas 自绘图标

> **Status**：已被 ADR-0005 取代——v0.3.1 起数量角标整体移除，本方案不再使用，仅作历史记录。

v0.2.1 用户反馈：三字符角标（如「100」）在 16px 工具栏图标上**铺满整个图标、完全遮挡图案**，且要求「数字缩小、放到右下角显示」。Chrome 原生 `chrome.action.setBadgeText` 由浏览器渲染，无法控制角标大小与位置，无法满足该要求。决定：弃用原生角标，改为在 MV3 service worker 中用 `OffscreenCanvas` 自绘工具栏图标——蓝色 Material「history」图标（与 icons/*.png 同形状、同 `#1A73E8`）+ 右下角红色小圆点（`#D93025`、白描边、白字数量），经 `chrome.action.setIcon({ imageData })` 应用；4 倍超采样保证 16px 下边缘平滑，绘制结果按 `"size|text"` 缓存 ImageData。

**Considered Options**：
- 原生 `setBadgeText`（维持现状）— 否决：字体与位置由 Chrome 决定，三字符必然铺满 16px 图标并遮挡图案。
- 文案截断为「99+」或改用「满」等短词 — 否决：仍是原生样式，同样铺满图标，且语义不清；用户明确要求「数字小、在右下角」。
- **自绘图标（OffscreenCanvas + setIcon imageData）— 采用**：位置、大小、配色完全可控，圆点收在右下角、白描边与蓝色主体分离。

**Consequences**：
- 图标绘制由插件自行负责，须与 manifest 默认图标保持同一形状来源与配色，避免加载初期（service worker 未运行时）跳变。
- 历史变化时需重绘图标（300ms 防抖 + ImageData 缓存，无常驻开销，不改变 MV3 事件驱动模型）。
- 无障碍性略降：自绘数字不可被读屏朗读（原生 badge 文案可）。数量仍在弹窗首部与标题语义中体现，可接受。
- 从 v0.2.0 升级时，Chrome 会保留旧的原生角标状态，刷新时需 `setBadgeText({ text: "" })` 显式清除。
