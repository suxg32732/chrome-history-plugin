import test from "node:test";
import assert from "node:assert/strict";
import { fetchRecentRecords } from "./history-source.js";
import { RECENT_LIMIT } from "./model.js";

// Run fn with a mock chrome.history installed; always restore afterwards.
// Must await fn() (async) so teardown only runs after the test body finishes.
async function withMockChrome(searchImpl, fn) {
  const prev = globalThis.chrome;
  globalThis.chrome = { history: { search: searchImpl } };
  try {
    await fn();
  } finally {
    if (prev === undefined) delete globalThis.chrome;
    else globalThis.chrome = prev;
  }
}

test("fetchRecentRecords 向 chrome.history.search 传递正确参数并返回数组", async () => {
  const calls = [];
  await withMockChrome(
    async (q) => {
      calls.push(q);
      return [
        { url: "https://a.com", title: "A", lastVisitTime: 1 },
        { url: "https://b.com", title: "B", lastVisitTime: 2 },
      ];
    },
    async () => {
      const items = await fetchRecentRecords();
      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0], { text: "", startTime: 0, maxResults: RECENT_LIMIT });
      assert.equal(items.length, 2);
    },
  );
});

test("fetchRecentRecords 结果非数组时返回空数组", async () => {
  await withMockChrome(async () => null, async () => {
    const items = await fetchRecentRecords();
    assert.deepEqual(items, []);
  });
});

test("取数 + 浏览记录 经 mock 串联：标题兜底与主机名首字母正确", async () => {
  await withMockChrome(
    async () => [
      {
        url: "https://www.example.com",
        title: "",
        lastVisitTime: Date.parse("2026-09-01T12:00:00Z"),
      },
    ],
    async () => {
      const { toRecordModels } = await import("./model.js");
      const items = await fetchRecentRecords();
      const [rec] = toRecordModels(items);
      assert.equal(rec.title, "www.example.com"); // 标题兜底 hostname
      assert.equal(rec.letter, "W"); // 主机名首字母（不去 www.）
      assert.equal(typeof rec.relativeTime, "string");
      assert.ok(rec.relativeTime.length > 0); // 相对时间已生成，不绑定当前时间
    },
  );
});
