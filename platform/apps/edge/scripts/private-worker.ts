/** Patch only the generated Cloudflare worker; the Pages source stays owned by Lane 1. */
export function protectPrivateResponses(source: string): string {
  const fetchAnchor = '  if (url.origin !== self.location.origin) return;';
  const storageAnchor = '      response.status === 200 &&';
  if (!source.includes(fetchAnchor) || !source.includes(storageAnchor)) {
    throw new Error("Offline worker changed: recheck private API cache exclusion before release");
  }
  return source.replace(fetchAnchor, `${fetchAnchor}\n  // Lane 3: never intercept API requests, including when offline.\n  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return;`)
    .replace(storageAnchor, `${storageAnchor}\n      !/(?:^|,)\\s*(?:private|no-store)(?:\\s|=|,|$)/i.test(response.headers.get("cache-control") || "") &&`)
    + `\n// Lane 3: remove any private entries left by a pre-account worker version.\nself.addEventListener("activate", (event) => {\n  event.waitUntil((async () => {\n    for (const name of await caches.keys()) {\n      if (!name.startsWith(CONFIG.cachePrefix)) continue;\n      const cache = await caches.open(name);\n      for (const request of await cache.keys()) {\n        const path = new URL(request.url).pathname;\n        const response = await cache.match(request);\n        if (path === "/api" || path.startsWith("/api/") || /(?:^|,)\\s*(?:private|no-store)(?:\\s|=|,|$)/i.test(response?.headers.get("cache-control") || "")) await cache.delete(request);\n      }\n    }\n  })());\n});\n`;
}
