/*
 * Apple TV Shadowrocket YouTube path reporter (privacy-minimized, LAN only).
 *
 * Sends only a sanitized host/path and a few non-credential protocol fields to
 * 192.168.1.130. Query strings, fragments, cookies, authorization headers,
 * request/response bodies, and complete header sets are never read or sent.
 */

(() => {
  const COLLECTOR = "http://192.168.1.130:8765/collect/019feab9e68a7403";
  const CACHE_KEY = "YT-tvOS-safe-path-cache-v7";
  const DEDUPE_MS = 60 * 1000;
  const CACHE_LIMIT = 80;

  const request = typeof $request !== "undefined" ? $request : {};
  const response = typeof $response !== "undefined" ? $response : null;
  const rawURL = request.url ? String(request.url) : "";
  const match = rawURL.match(/^https?:\/\/([^/:?#]+)(?::\d+)?([^?#]*)/i);

  if (!match) {
    $done({});
    return;
  }

  const host = String(match[1] || "").toLowerCase().slice(0, 255);
  const path = String(match[2] || "/").split("?")[0].split("#")[0].slice(0, 1000) || "/";
  const event = response ? "response" : "request";

  const allowedHost = /(^|\.)(youtube\.com|googlevideo\.com|googleapis\.com)$/i.test(host);
  if (!allowedHost) {
    $done({});
    return;
  }

  const readHeader = (headers, name) => {
    if (!headers || typeof headers !== "object") return "";
    const target = name.toLowerCase();
    for (const key of Object.keys(headers)) {
      if (String(key).toLowerCase() === target) {
        return String(headers[key] || "").slice(0, 300);
      }
    }
    return "";
  };

  const headers = request.headers || {};
  const responseHeaders = response && response.headers ? response.headers : {};
  const record = {
    event,
    host,
    path,
    method: String(request.method || "").slice(0, 16),
    content_type: readHeader(response ? responseHeaders : headers, "content-type"),
    youtube_client_name: readHeader(headers, "x-youtube-client-name"),
    youtube_client_version: readHeader(headers, "x-youtube-client-version"),
  };

  if (response) {
    record.status = String(response.status || response.statusCode || "").slice(0, 16);
  }

  const now = Date.now();
  const fingerprint = [
    record.event,
    record.host,
    record.path,
    record.method,
    record.status || "",
    record.content_type || "",
    record.youtube_client_name || "",
    record.youtube_client_version || "",
  ].join("|");

  let cache = {};
  if (typeof $persistentStore !== "undefined") {
    try {
      cache = JSON.parse($persistentStore.read(CACHE_KEY) || "{}") || {};
    } catch (_) {
      cache = {};
    }
  }

  if (cache[fingerprint] && now - Number(cache[fingerprint]) < DEDUPE_MS) {
    $done({});
    return;
  }

  cache[fingerprint] = now;
  const recent = Object.keys(cache)
    .map((key) => [key, cache[key]])
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, CACHE_LIMIT);
  if (typeof $persistentStore !== "undefined") {
    const compactCache = {};
    for (const item of recent) {
      compactCache[item[0]] = item[1];
    }
    $persistentStore.write(JSON.stringify(compactCache), CACHE_KEY);
  }

  console.log(`[YT-tvOS-v7] ${event} ${host}${path}`);

  if (typeof $httpClient === "undefined") {
    $done({});
    return;
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    $done({});
  };

  $httpClient.post(
    {
      url: COLLECTOR,
      headers: {
        "Content-Type": "application/json",
        "X-YouTube-Debug-Version": "v7",
      },
      body: JSON.stringify(record),
      timeout: 1,
    },
    () => finish()
  );

  // Never let diagnostics hold up YouTube playback for more than 800 ms.
  if (typeof setTimeout === "function") {
    setTimeout(finish, 800);
  }
})();
