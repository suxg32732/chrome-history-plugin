// Narrow data-access interface over the browser's native history source.
// Keeps chrome.* behind exactly one function so it can be mocked in tests
// without launching a browser. See ADR-0001 for why we use the native API.

import { RECENT_LIMIT } from "./model.js";

export async function fetchRecentRecords() {
  const items = await chrome.history.search({
    text: "",
    startTime: 0,
    maxResults: RECENT_LIMIT,
  });
  return Array.isArray(items) ? items : [];
}
