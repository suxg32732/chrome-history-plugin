# 02 — 健壮性状态与视图模型测试

**What to build:** 在 01 的基础上补齐健壮性状态与测试——加载中 / 空 / 无权限三类状态、标题兜底为 hostname、长标题省略、30 行可滚动；并为**视图模型转换**（相对时间格式化、首字母+颜色派生、标题兜底）补充单元测试，即 spec 中定义的唯一测试接缝。

**Blocked by:** 01 — Scaffold MV3 扩展并打通核心闭环（从零到可用 MVP）

**Status:** resolved

- [x] 加载历史时显示加载状态；历史为空时显示空状态；`history` 权限被拒或不可用时显示明确提示，而非空白弹窗
- [x] 记录标题为空时兜底显示 hostname
- [x] 长标题截断为省略号，布局不破
- [x] 30 条记录在弹窗内可滚动查看
- [x] 视图模型转换有单元测试：相对时间边界（刚刚 / 分钟 / 小时 / 天）、字母+颜色对域名确定性、标题兜底
- [x] `chrome.history` 取数封装在窄接口之后，测试用 mock 的 `chrome.history` 驱动，不启动浏览器

## Comments

- 新增 `history-source.js`：窄接口 `fetchRecentRecords()` 封装 `chrome.history.search`，并导出 `RECENT_LIMIT = 30`（与 `model.js` 共用，避免魔法数字漂移）。
- 新增 `history-source.test.mjs`：3 个测试——参数正确性、非数组兜底为空数组、mock 串联视图模型。修复了 `withMockChrome` 未 `await fn()` 导致 `finally` 提前还原 `chrome` 的 bug（测试 3 因 `import` 在 `fetch` 之前而暴露）。
- `model.js`：导出 `RECENT_LIMIT`，`toRecordModels` 按 URL 去重并截断到 30 条（落实 `CONTEXT.md`「不重复网址」与用户故事 11）；`deriveAvatar` 取主机名首字母（不舍弃 `www.`）。
- `model.test.mjs` 新增国际化/非 ASCII 主机名用例：浏览器将 Unicode 主机名规范为 punycode（`xn--fsqu00a.com`），头像字母取 punycode 首字符「X」，不崩溃。
- `popup.js`：`render()` 移出 try/catch，渲染错误不再被误报为「权限问题」；无权限时明确提示。
- 新增 `package.json`（`node --test` 运行器）与 `docs/manual-test-checklist.md`（Chrome 152 手动验收清单）。
- 双轴代码评审（Standards + Spec）发现并修正：测试名用词对齐术语表（视图模型→浏览记录）、`RECENT_LIMIT` 常量提取、spec 第 37 行「无需额外去重」陈旧声明已与实现/术语表对齐。
- 测试：`node --test` 全部 10 例通过。
