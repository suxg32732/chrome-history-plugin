// Pure view-model transform for the recent-history popup.
// No chrome.* or DOM access here — keeps the test seam headless.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// 领域常量：最近99条（不重复网址）。取数层与视图模型层共用，避免魔法数字漂移。
// 上限取 99 而非 100（见 ADR-0004）。
export const RECENT_LIMIT = 99;

// 领域常量：请求 favicon 的边长。弹窗按 16px 展示，请求 32px 以保证高分屏清晰。
export const FAVICON_SIZE = 32;

export function formatRelativeTime(lastVisitTime, now = Date.now()) {
  if (!lastVisitTime || lastVisitTime <= 0) return "";
  const diff = Math.max(0, now - lastVisitTime);
  if (diff < MINUTE) return "刚刚";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}小时前`;
  return `${Math.floor(diff / DAY)}天前`;
}

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 360;
  }
  if (h < 0) h += 360;
  return h;
}

export function deriveAvatar(url) {
  let hostname = "";
  try {
    hostname = new URL(url).hostname || "";
  } catch {
    hostname = "";
  }
  const letter = (hostname[0] || "?").toUpperCase();
  const color = `hsl(${hashHue(hostname || "?")}, 55%, 48%)`;
  return { letter, color, hostname };
}

// 构建官方 Favicon API 的图片地址（chrome-extension://<id>/_favicon/?pageUrl=…&size=…）。
// 该端点读取 Chrome 本地 favicon 缓存，与 chrome://history 显示的图标同源。
// 仅 http(s) 网址有真实站点图标；其余（chrome://、file://、非法 URL）返回 null，
// 由调用方回退为本地首字母头像。
export function faviconUrlFor(url, faviconBase) {
  if (!faviconBase) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  return `${faviconBase}?pageUrl=${encodeURIComponent(url)}&size=${FAVICON_SIZE}`;
}

export function toRecordModel(item) {
  const { letter, color, hostname } = deriveAvatar(item.url);
  const title = (item.title && item.title.trim()) || hostname || item.url;
  return {
    url: item.url,
    title,
    hostname,
    letter,
    color,
    relativeTime: formatRelativeTime(item.lastVisitTime),
  };
}

export function toRecordModels(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item || !item.url) continue;
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    // 序号：从 1 开始按展示顺序递增，与访问次数无关。
    out.push({ ...toRecordModel(item), index: out.length + 1 });
    if (out.length >= RECENT_LIMIT) break;
  }
  return out;
}

// 关键词过滤：只作用于**已加载的最近 99 条**，不检索全量历史（ADR-0006）。
// 匹配为不区分大小写的**子串**匹配，作用于标题与网址——刻意不复刻 Chrome 内置
// 历史页的「分词 + 前缀（≥3 字符）+ AND」语义，两者结果会不同，属有意为之。
// 命中后序号按过滤结果重新从 1 编号（「这一屏的第 N 行」），不保留原「最近第 N 个」位次。
export function filterRecords(records, keyword) {
  if (!Array.isArray(records)) return [];
  const q = String(keyword ?? "").trim().toLowerCase();
  if (!q) return records;
  const hit = records.filter((r) => {
    if (!r) return false;
    const title = String(r.title ?? "").toLowerCase();
    const url = String(r.url ?? "").toLowerCase();
    return title.includes(q) || url.includes(q);
  });
  return hit.map((r, i) => ({ ...r, index: i + 1 }));
}
