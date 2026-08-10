/*
 * YouTube tvOS path notifier for Shadowrocket/Surge compatible engines.
 * Privacy: only pathname is displayed; query strings, headers and bodies
 * are never read or transmitted. The last pathname is stored locally only
 * to avoid duplicate notifications.
 */

(() => {
  const raw = typeof $request !== "undefined" && $request.url
    ? String($request.url)
    : "";

  // Strip scheme/host and all query/fragment data.
  const path = raw
    .replace(/^https?:\/\/[^/]+/i, "")
    .split("?")[0]
    .split("#")[0] || "/";

  const key = "YT-tvOS-last-safe-path";
  let previous = "";
  if (typeof $persistentStore !== "undefined") {
    previous = $persistentStore.read(key) || "";
  }

  console.log(`[YT-tvOS-PATH] ${path}`);

  if (path !== previous) {
    if (typeof $persistentStore !== "undefined") {
      $persistentStore.write(path, key);
    }
    if (typeof $notification !== "undefined") {
      $notification.post("YouTube tvOS 路径", "", path);
    } else if (typeof $notify !== "undefined") {
      $notify("YouTube tvOS 路径", "", path);
    }
  }

  $done({});
})();
