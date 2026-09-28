# 历史记录插件领域模型

一款 Chrome 扩展（MV3，目标 Chrome 128+，兼容 152）：点击工具栏图标，在弹窗中滚动展示浏览器最近 99 条浏览记录，点击某条在新标签页前台打开；弹窗底部「显示所有历史」一键跳转 `chrome://history`。

## 语言 / Language

### 浏览记录模型

**浏览记录 (Browsing Record)**：
弹窗列表中的一行。对应 `chrome.history.search` 返回的一个 `HistoryItem`，以 URL 唯一标识，包含 URL、标题、最后访问时间、访问次数。
_Avoid_：历史条目、访问日志。

**最近99条 (Recent 99)**：
按 `lastVisitTime` 倒序取的最近 99 个**不重复网址**（同一网址多次打开只算 1 条），通过 `startTime: 0, maxResults: 99` 取得（见 ADR-0004）。弹窗默认可见约前 10 条（受 Chrome 弹窗 600px 高度上限约束），滚动查看全部。
_Avoid_：最近30条、最近100条、最近100次访问。

**历史来源 (History Source)**：
为插件提供浏览记录的系统。本插件使用浏览器原生的 `chrome.history` API，而非自建日志。
_Avoid_：数据源。

### 交互与展示

**弹窗 (Popup)**：
点击工具栏图标时显示的 UI 表面，渲染最近 99 条浏览记录。由 manifest 的 `action.default_popup` 实现。
_Avoid_：面板、侧边栏。

**关键词过滤 (Keyword Filter)**：
弹窗顶部搜索框中的关键词对**已加载的最近 99 条**所做的本地筛选。只作用于当前列表，不检索全量历史（见 ADR-0006）。匹配不区分大小写，按子串作用于标题与网址。
_Avoid_：搜索、历史搜索、检索。

**全量检索 (Full-corpus Search)**：
在浏览器全部历史记录中按关键词查找的能力，由 Chrome 内置历史页提供，本插件不实现（见 ADR-0004）。插件底部「显示所有历史」是它在插件内的唯一入口。
_Avoid_：插件搜索、扩展内搜索。

**序号 (Row Index)**：
弹窗列表每行行首的数字，从 1 开始按**当前列表**的展示顺序连续递增（即「这一屏的第 N 行」），与访问次数无关。列表经关键词过滤后按过滤结果重新编号，不保留原「最近第 N 个」位次（见 ADR-0006）。
_Avoid_：访问次数、记录 ID、最近排名、最近第 N 个。

**前台激活新标签 (Foreground New Tab)**：
通过 `chrome.tabs.create({ url, active: true })` 在新标签打开某条记录的网址并把焦点切过去。
_Avoid_：后台标签。

**网站图标 (Favicon)**：
每条记录左侧的小图标。采用 **Chrome 本地 favicon 缓存**（官方 Favicon API：`favicon` 权限 + `_favicon/` 端点），与 `chrome://history` 显示的图标同源一致；仅对 http(s) 网址使用，内部页或加载失败时回退为**本地首字母头像**。
_Avoid_：Google s2 等第三方图标服务。

**相对时间 (Relative Time)**：
每条记录展示的「x分钟前」样式时间戳，由 `lastVisitTime` 推算。
_Avoid_：绝对时间。
