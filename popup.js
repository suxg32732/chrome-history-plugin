import { toRecordModels, filterRecords, faviconUrlFor } from "./model.js";
import { fetchRecentRecords } from "./history-source.js";

// 官方 Favicon API 的本地端点，读取 Chrome favicon 缓存（见 ADR-0002）。
const FAVICON_BASE = chrome.runtime.getURL("_favicon/");

const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
const showAllEl = document.getElementById("showAll");
const searchEl = document.getElementById("search");

// 已加载的最近 99 条。关键词过滤只作用于此，不检索全量历史（ADR-0006）。
let allRecords = [];
// 就绪门闩：取数成功前不接受过滤，避免「加载中…」或权限错误文案被过滤结果顶掉。
let searchReady = false;

// 只隐藏列表，不隐藏搜索框——搜索框在 sticky 头部，无匹配时仍须可编辑。
function showStatus(msg) {
  const has = Boolean(msg);
  statusEl.textContent = msg || "";
  statusEl.hidden = !has;
  listEl.hidden = has;
}

function openUrl(url) {
  chrome.tabs.create({ url, active: true });
}

// 底部「显示所有历史」：新标签打开 Chrome 内置历史页后关闭弹窗。
// 它也是全量检索（Full-corpus Search）在插件内的唯一入口，见 CONTEXT.md / ADR-0006。
showAllEl.addEventListener("click", () => {
  openUrl("chrome://history/");
  window.close();
});

// 关键词过滤：即时生效、不做防抖——99 条的内存子串匹配成本可忽略（ADR-0006）。
// 无匹配时的文案与「历史为空」区分开，用户才知道是筛没了还是真没有。
function applyFilter() {
  if (!searchReady) return;
  const keyword = searchEl.value;
  render(
    filterRecords(allRecords, keyword),
    keyword.trim() ? "没有匹配的记录" : "暂无浏览记录",
  );
}

searchEl.addEventListener("input", applyFilter);

// Esc 清空关键词并恢复完整列表；不清空时不拦截（不占用 Esc 的默认行为）。
// 不移动焦点，因此清空后焦点仍留在搜索框。
searchEl.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && searchEl.value) {
    e.preventDefault();
    searchEl.value = "";
    applyFilter();
  }
});

// 打开弹窗即聚焦搜索框。Tab 仍可到达列表行，既有键盘流程不受影响。
searchEl.focus();

function makeAvatar(r) {
  const av = document.createElement("span");
  av.className = "avatar";
  av.style.backgroundColor = r.color;
  av.textContent = r.letter;
  return av;
}

// 行首图标：http(s) 用真实 favicon（chrome://history 同源），失败或非 http(s) 回退首字母头像。
function makeIcon(r) {
  const slot = document.createElement("span");
  slot.className = "icon-slot";
  const fav = faviconUrlFor(r.url, FAVICON_BASE);
  if (fav) {
    const img = document.createElement("img");
    img.className = "favicon";
    img.alt = "";
    img.src = fav;
    img.addEventListener("error", () => img.replaceWith(makeAvatar(r)));
    slot.append(img);
  } else {
    slot.append(makeAvatar(r));
  }
  return slot;
}

function render(records, emptyMessage) {
  listEl.replaceChildren();
  if (!records.length) {
    showStatus(emptyMessage);
    return;
  }
  showStatus("");
  const frag = document.createDocumentFragment();
  for (const r of records) {
    const li = document.createElement("li");
    li.className = "row";
    li.tabIndex = 0;

    const idx = document.createElement("span");
    idx.className = "idx";
    idx.textContent = String(r.index);

    const icon = makeIcon(r);

    const body = document.createElement("span");
    body.className = "body";
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = r.title;
    title.title = r.title;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = r.relativeTime;
    body.append(title, meta);

    li.append(idx, icon, body);
    li.addEventListener("click", () => openUrl(r.url));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openUrl(r.url);
      }
    });
    frag.appendChild(li);
  }
  listEl.appendChild(frag);
}

async function main() {
  showStatus("加载中…");
  let items;
  try {
    items = await fetchRecentRecords();
  } catch (err) {
    console.error("加载浏览记录失败", err);
    showStatus("无法加载浏览记录，请检查历史记录权限");
    return;
  }
  // 取数只在弹窗打开时发生一次；之后的关键词过滤全在内存里完成，不再请求历史。
  allRecords = toRecordModels(items);
  searchReady = true;
  applyFilter();
}

main();
