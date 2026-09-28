Status: ready-for-agent
Triage: ready-for-agent

# Spec: 最近浏览记录弹窗扩展 (Recent-History Popup)

> 词汇与决策以根目录 `CONTEXT.md` 与 `docs/adr/0001-native-history-source.md` 为准。

## Problem Statement

用户想在不打开 Chrome 完整历史页（chrome://history）并层层翻找的情况下，快速回到刚访问过的页面。当前要找回一个刚开的网页需要多点几步进入历史 UI。用户希望有一个工具栏按钮：点击即展示最近访问的 30 个页面，并能一键在新标签页中重新打开其中任意一条。

## Solution

一款 Manifest V3 扩展：点击工具栏图标，弹出**弹窗 (Popup)**，列出 30 条最近的**浏览记录 (最近30条)**。历史来自浏览器原生 **历史来源 (History Source)**，即 `chrome.history` API（见 ADR-0001）。每条记录显示**本地首字母头像 (Favicon)**、页面标题与**相对时间 (Relative Time)**；点击记录以**前台激活新标签 (Foreground New Tab)** 打开其网址。

## User Stories

1. As a user, I want to click the extension icon and immediately see my 30 most recently visited pages, so that I can quickly get back to something I just opened.
2. As a user, I want the list to include pages visited before I installed the extension, so that it is useful from day one.
3. As a user, I want each record to show the page title, so that I can recognize the page without reading the raw URL.
4. As a user, I want each record to show a small site icon, so that I can scan the list visually.
5. As a user, I want each record to show how long ago I visited it (e.g. "5分钟前"), so that I can judge recency at a glance.
6. As a user, I want clicking a record to open the page in a new tab that becomes active, so that I land on it immediately.
7. As a user, I want the list to refresh each time I open the popup, so that it always reflects my latest history.
8. As a user, I want the popup to appear with a single click (no extra steps), so that access is frictionless.
9. As a privacy-conscious user, I want no third party to receive my browsing data when icons are rendered, so that my history stays local.
10. As a user, I want the extension to run on Chrome 152, so that it works on my current browser.
11. As a user, I want pages I visited multiple times to appear once (deduplicated by URL), so that the list is not cluttered with repeats.
12. As a user, I want internal pages (chrome://, extension pages) and incognito visits excluded automatically, so that the list stays relevant to normal web browsing.
13. As a user, I want a clear loading/empty state if history is unavailable or permission is denied, so that I am not confused by a blank popup.
14. As a user, I want long titles truncated with an ellipsis, so that the layout does not break.
15. As a user, I want the popup to scroll when there are 30 items, so that I can see them all.

## Implementation Decisions

- **Manifest**: `manifest_version: 3`；`permissions: ["history"]`；`action.default_popup` 指向弹窗 HTML；`minimum_chrome_version: "128"`（兼容 Chrome 152，全程可用 `async/await`）。
- **历史来源 (ADR-0001)**: 使用原生 `chrome.history.search({ text: "", startTime: 0, maxResults: 30 })`。为严格落实「30 条不重复网址」（`CONTEXT.md` 与用户故事 11），在视图模型层按 URL 去重；`chrome.history.search` 实际可能返回重复 URL，故不在取数层假设其已去重。注意必须传 `startTime: 0`，否则 API 默认只取最近 24 小时。
- **弹窗 (Popup)**: 通过 `action.default_popup` 实现，渲染最近30条。
- **网站图标 (Favicon)**: 本地首字母头像——取主机名首字母，按域名哈希得到稳定颜色，纯本地渲染，无任何网络请求、不连第三方。
- **相对时间 (Relative Time)**: 由 `lastVisitTime` 在客户端格式化（如 刚刚 / x分钟前 / x小时前 / x天前）。
- **前台激活新标签 (Foreground New Tab)**: 点击记录调用 `chrome.tabs.create({ url, active: true })`。
- **过滤**: 不做额外过滤；`chrome://`、扩展页、无痕记录本就不进入 `chrome.history`，天然排除。
- **UI 语言**: 中文。
- **v1 范围**: 纯 MVP——不含弹窗内搜索、不含单条删除/置顶。
- **无后端、无持久化存储**：每次打开弹窗即时拉取，不需要 background 持久状态（MV3 service worker 仅作标准引导）。

## Testing Decisions

- **最高测试接缝 (single seam)**: 纯函数式的「视图模型转换」——把 `chrome.history` 的 `HistoryItem[]` 映射为渲染行（首字母头像字母+颜色、相对时间、标题兜底）。该逻辑不依赖浏览器，可无头单元测试。
- **单元测试覆盖**:
  - 相对时间格式化的边界（刚刚 / 分钟 / 小时 / 天）。
  - 首字母头像字母与颜色的派生（对域名确定性、对国际化/含非 ASCII 主机名有稳健兜底）。
  - 标题为空时兜底为 hostname。
  - `toRecordModels` 按 URL 去重并截断到 30 条：验证顺序、条数上限，以及对重复 URL 的合并符合预期。
- **隔离 chrome.history**: 取数封装在窄接口后，用 mock 的 `chrome.history` 驱动上述测试，避免为数据整形而启动完整浏览器。
- **手动端到端验收 (v1 不自动化)**: 在 Chrome 152 加载解压扩展 → 点击图标 → 校验渲染 30 行 → 点击某行确为前台新标签打开。作为手动验收清单记录，而非自动化测试。
- **先验 (prior art)**: 仓库为绿地，暂无同类测试；选定测试运行器后遵循标准 JS 单元测试约定。

## Out of Scope

- 弹窗内搜索/过滤框。
- 单条删除或置顶。
- 侧边栏或新标签页覆盖的 UI 表面（仅 Popup）。
- 真实「每次打开都算一条」时间线（需自建导航日志，依 ADR-0001 推迟）。
- 扩展在隐身模式下的行为。
- 跨设备同步；仅展示本机历史。
- 比 128 更严格的 `minimum_chrome_version`。
- 从网络获取真实站点 favicon（隐私决策：仅本地）。

## Further Notes

- 授予 `history` 权限时，Chrome 安装会弹出警告（"读取并更改你的浏览记录"），这是预期且必要的。
- 首字母头像牺牲了真实图标的视觉辨识度——这是已记录的权衡（见 ADR-0001）。
- 参考：`CONTEXT.md`（词汇表）与 `docs/adr/0001-native-history-source.md`（决策与权衡）。
