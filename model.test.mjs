import test from "node:test";
import assert from "node:assert/strict";
import {
  RECENT_LIMIT,
  FAVICON_SIZE,
  formatRelativeTime,
  deriveAvatar,
  faviconUrlFor,
  toRecordModel,
  toRecordModels,
  filterRecords,
} from "./model.js";

const NOW = Date.parse("2026-09-01T12:00:00Z");

test("formatRelativeTime 边界", () => {
  assert.equal(formatRelativeTime(NOW, NOW), "刚刚");
  assert.equal(formatRelativeTime(NOW - 5 * 60 * 1000, NOW), "5分钟前");
  assert.equal(formatRelativeTime(NOW - 3 * 60 * 60 * 1000, NOW), "3小时前");
  assert.equal(formatRelativeTime(NOW - 2 * 24 * 60 * 60 * 1000, NOW), "2天前");
});

test("deriveAvatar 取主机名首字母并按域名确定性着色", () => {
  const a = deriveAvatar("https://www.example.com/path");
  assert.equal(a.letter, "W");
  assert.equal(a.hostname, "www.example.com");
  const b = deriveAvatar("https://www.example.com/other");
  assert.equal(a.color, b.color);
  const c = deriveAvatar("https://www.google.com");
  assert.notEqual(a.color, c.color);
});

test("deriveAvatar 异常/非 http(s) URL 不崩溃", () => {
  const a = deriveAvatar("not-a-url");
  assert.equal(a.letter, "?");
  assert.equal(a.hostname, "");
  const b = deriveAvatar("chrome://extensions");
  assert.equal(b.hostname, "extensions");
});

test("deriveAvatar 国际化/非 ASCII 主机名不崩溃", () => {
  const a = deriveAvatar("https://xn--fsqu00a.com"); // punycode: 例子.com
  assert.equal(a.hostname, "xn--fsqu00a.com");
  assert.equal(a.letter, "X");
  const b = deriveAvatar("https://例子.com");
  assert.equal(b.hostname, "xn--fsqu00a.com"); // 浏览器将 Unicode 主机名规范为 punycode
  assert.equal(b.letter, "X"); // 取 punycode 首字符作头像字母，不崩溃
});

test("toRecordModel 标题兜底", () => {
  const m = toRecordModel({
    url: "https://www.example.com",
    title: "",
    lastVisitTime: NOW,
  });
  assert.equal(m.title, "www.example.com");
  const m2 = toRecordModel({
    url: "https://www.example.com",
    title: "   ",
    lastVisitTime: NOW,
  });
  assert.equal(m2.title, "www.example.com");
  const m3 = toRecordModel({
    url: "https://www.example.com",
    title: "Example",
    lastVisitTime: NOW,
  });
  assert.equal(m3.title, "Example");
});

test("toRecordModels 顺序、条数与空值", () => {
  const items = [
    { url: "https://a.com", title: "A", lastVisitTime: 100 },
    { url: "https://b.com", title: "B", lastVisitTime: 200 },
  ];
  const ms = toRecordModels(items);
  assert.equal(ms.length, 2);
  assert.equal(ms[0].url, "https://a.com");
  assert.equal(ms[1].url, "https://b.com");
  assert.equal(ms[0].index, 1); // 序号从 1 开始，按展示顺序递增
  assert.equal(ms[1].index, 2);
  assert.equal(toRecordModels(null).length, 0);
  assert.equal(toRecordModels(undefined).length, 0);
});

test("toRecordModels 按网址去重", () => {
  const items = [
    { url: "https://a.com", title: "A", lastVisitTime: 300 },
    { url: "https://a.com", title: "A again", lastVisitTime: 100 },
    { url: "https://b.com", title: "B", lastVisitTime: 200 },
  ];
  const ms = toRecordModels(items);
  assert.equal(ms.length, 2);
  assert.equal(ms[0].url, "https://a.com");
  assert.equal(ms[0].title, "A");
  assert.equal(ms[0].index, 1);
  assert.equal(ms[1].index, 2); // 去重后 b 排第二，序号按展示顺序而非时间
});

test("toRecordModels 最多保留 RECENT_LIMIT（99）条", () => {
  const items = [];
  for (let i = 0; i < 150; i++) {
    items.push({ url: `https://site${i}.com`, title: `S${i}`, lastVisitTime: i });
  }
  const ms = toRecordModels(items);
  assert.equal(ms.length, RECENT_LIMIT);
  assert.equal(ms[0].url, "https://site0.com");
});

test("faviconUrlFor 仅为 http(s) 构建 _favicon 端点地址", () => {
  const base = "chrome-extension://abc/_favicon/";
  const u = faviconUrlFor("https://www.example.com/a?b=1", base);
  assert.ok(u.startsWith(base));
  assert.ok(u.includes(`pageUrl=${encodeURIComponent("https://www.example.com/a?b=1")}`));
  assert.ok(u.includes(`size=${FAVICON_SIZE}`));
  assert.equal(faviconUrlFor("chrome://extensions", base), null);
  assert.equal(faviconUrlFor("file:///C:/x.txt", base), null);
  assert.equal(faviconUrlFor("not-a-url", base), null);
  assert.equal(faviconUrlFor("https://www.example.com", ""), null);
});

// ---- 关键词过滤（见 ADR-0006：只过滤已加载的最近 99 条）----

const FILTER_FIXTURE = [
  { url: "https://news.example.com/a", title: "今日要闻", index: 1 },
  { url: "https://www.google.com", title: "Google", index: 2 },
  { url: "https://docs.example.org/guide", title: "", index: 3 },
];

test("filterRecords 空关键词/纯空白返回原列表且不重排", () => {
  assert.equal(filterRecords(FILTER_FIXTURE, ""), FILTER_FIXTURE);
  assert.equal(filterRecords(FILTER_FIXTURE, "   "), FILTER_FIXTURE);
  assert.equal(filterRecords(FILTER_FIXTURE, null), FILTER_FIXTURE);
  assert.equal(filterRecords(FILTER_FIXTURE, undefined), FILTER_FIXTURE);
});

test("filterRecords 非数组输入返回空数组", () => {
  assert.deepEqual(filterRecords(null, "a"), []);
  assert.deepEqual(filterRecords(undefined, "a"), []);
  assert.deepEqual(filterRecords("nope", "a"), []);
});

test("filterRecords 子串匹配标题与网址，且不区分大小写", () => {
  assert.equal(filterRecords(FILTER_FIXTURE, "要闻").length, 1);
  assert.equal(filterRecords(FILTER_FIXTURE, "要闻")[0].url, "https://news.example.com/a");
  // 匹配网址
  assert.equal(filterRecords(FILTER_FIXTURE, "google").length, 1);
  assert.equal(filterRecords(FILTER_FIXTURE, "GOOGLE").length, 1);
  // 子串而非整词/前缀：'oogl' 命中 Google；'www.goo' 跨越 "www." 词边界，
  // Chrome 内置页的分词匹配不会命中这两类，本插件刻意宽松（ADR-0006）。
  assert.equal(filterRecords(FILTER_FIXTURE, "oogl").length, 1);
  assert.equal(filterRecords(FILTER_FIXTURE, "www.goo").length, 1);
  assert.equal(filterRecords(FILTER_FIXTURE, "xample").length, 2);
  // 关键词首尾空白被忽略
  assert.equal(filterRecords(FILTER_FIXTURE, "  google  ").length, 1);
});

test("filterRecords 标题为空时仍可被网址搜到", () => {
  const hit = filterRecords(FILTER_FIXTURE, "example.org");
  assert.equal(hit.length, 1);
  assert.equal(hit[0].index, 1);
});

test("filterRecords 命中后序号按过滤结果重新从 1 编号", () => {
  const hit = filterRecords(FILTER_FIXTURE, "example");
  assert.equal(hit.length, 2);
  assert.equal(hit[0].index, 1); // 原为 1
  assert.equal(hit[1].index, 2); // 原为 3，重排为 2（不再保留「最近第 3 个」）
  assert.deepEqual(
    hit.map((r) => r.url),
    ["https://news.example.com/a", "https://docs.example.org/guide"],
  );
});

test("filterRecords 无匹配返回空数组", () => {
  assert.deepEqual(filterRecords(FILTER_FIXTURE, "zzzz-no-match"), []);
});

test("filterRecords 不修改入参元素（返回新对象）", () => {
  const hit = filterRecords(FILTER_FIXTURE, "example");
  assert.notEqual(hit[1], FILTER_FIXTURE[2]); // 重排产生新对象
  assert.equal(FILTER_FIXTURE[2].index, 3); // 原数组未被改写
  assert.equal(FILTER_FIXTURE[0].index, 1);
});
