/*
 * YouTube tvOS request-path logger for Shadowrocket/Surge.
 * Local-only diagnostics: no network calls, no persistent storage,
 * no request/response modification, and no header/body access.
 */

(() => {
  const url = typeof $request !== "undefined" && $request.url
    ? $request.url
    : "(unknown URL)";
  console.log(`[YT-tvOS-PATH] ${url}`);
  $done({});
})();
