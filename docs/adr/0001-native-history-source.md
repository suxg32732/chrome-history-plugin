# 使用浏览器原生 history API 作为历史来源

> 2026-09 更新：其中「favicon 采用首字母头像」的权衡已被 [ADR-0002](0002-real-favicons-via-chrome-favicon-api.md) 取代；历史来源决定仍有效。

v1 以原生 `chrome.history`（仅需 `history` 权限）作为唯一历史来源，返回最近 30 个不重复网址。

决定：用 `chrome.history.search({ text: "", startTime: 0, maxResults: 30 })` 读取浏览器已有历史，而非自建导航日志。

理由：原生 API 安装前即生效、实现最简单、仅需一个权限；代价是同网址多次打开只计 1 条、无法呈现「每次打开都算一条」的连续时间线、且不含无痕浏览记录。若未来需要真实时间线，再引入 tabs/webNavigation + storage 的自建日志方案，但那需要更多权限与存储管理，不在 v1 范围。

已知权衡（未单独立 ADR，因改动成本极低）：favicon 采用**本地首字母头像**，纯本地、零第三方请求；代价是看不到网站真实图标，视觉辨识度略低。若后续想要真实图标且不介意把域名发给 Google，可换回 `s2/favicons` 服务。
