# 用官方 Favicon API 展示真实站点图标

v0.2 需求要求网站图标与 `chrome://history` 一致，推翻 ADR-0001 中「favicon 采用本地首字母头像」的权衡（ADR-0001 的历史来源决定仍有效）。决定：manifest 声明 `favicon` 权限，图标走 `chrome.runtime.getURL("_favicon/") + ?pageUrl=…&size=32`（官方 Favicon API，Chrome 104+，本项目最低 128），直接读取 Chrome 本地 favicon 缓存——与 `chrome://history` 显示的图标同源、零第三方请求；仅对 http(s) 网址构建该地址，内部页与加载失败回退首字母头像。

**Considered Options**：Google s2 等外部图标服务（本地缓存未命中也能取图）因需把域名发给第三方被否；混合方案同样引入外发请求，一并否决。若未来要覆盖未缓存站点，再重新权衡并另立 ADR。

**Consequences**：本地缓存未命中的站点显示默认/回退图标（与 `chrome://history` 对无图标站点的行为一致）；多一个权限声明，`favicon` 与 `history` 并存时不产生额外安装告警面。
